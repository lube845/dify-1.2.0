'use client'

import type { WhitelistEntry } from '@/models/app-permission'
import { Button } from '@langgenius/dify-ui/button'
import { Dialog, DialogContent } from '@langgenius/dify-ui/dialog'
import { toast } from '@langgenius/dify-ui/toast'
import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '@/app/components/base/input'
import Loading from '@/app/components/base/loading'
import {
  useGrantWhitelistUsers,
  useRevokeWhitelistUser,
  useUpdateWhitelistExpiry,
  useWhitelist,
} from '@/service/use-permissions'

type WhitelistModalProps = {
  appId: string
  appName: string
  onClose: () => void
}

const parseUserIds = (raw: string): string[] => {
  return raw
    .split(/[,\n]/)
    .map(id => id.trim())
    .filter(Boolean)
}

const WhitelistModal = ({
  appId,
  appName,
  onClose,
}: WhitelistModalProps) => {
  const { t } = useTranslation()
  const { data, isPending } = useWhitelist(appId)
  const entries: WhitelistEntry[] = data?.data ?? []
  const { mutateAsync: grant } = useGrantWhitelistUsers(appId)
  const { mutateAsync: revoke } = useRevokeWhitelistUser(appId)
  const { mutateAsync: updateExpiry } = useUpdateWhitelistExpiry(appId)

  const [userIdsRaw, setUserIdsRaw] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [filter, setFilter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredEntries = useMemo(() => {
    if (!filter.trim())
      return entries
    const needle = filter.trim().toLowerCase()
    return entries.filter(entry => entry.user_id.toLowerCase().includes(needle))
  }, [entries, filter])

  const handleAdd = useCallback(async () => {
    const userIds = parseUserIds(userIdsRaw)
    if (userIds.length === 0) {
      toast.error(t('permissions.feedback.grantFailed', { ns: 'common' }))
      return
    }
    setIsSubmitting(true)
    try {
      const result = await grant({
        userIds,
        expiresAt: expiresAt || null,
      })
      setUserIdsRaw('')
      setExpiresAt('')
      if (result.skipped.length > 0) {
        toast.warning(
          t('permissions.feedback.grantPartial', { ns: 'common', skipped: result.skipped.length }),
        )
      }
    }
    catch {
      toast.error(t('permissions.feedback.grantFailed', { ns: 'common' }))
    }
    finally {
      setIsSubmitting(false)
    }
  }, [userIdsRaw, expiresAt, grant, t])

  const handleRevoke = useCallback(async (permId: string) => {
    try {
      await revoke(permId)
    }
    catch {
      toast.error(t('permissions.feedback.revokeFailed', { ns: 'common' }))
    }
  }, [revoke, t])

  const handleUpdateExpiry = useCallback(async (permId: string, value: string) => {
    try {
      await updateExpiry({ permId, expiresAt: value || null })
    }
    catch {
      toast.error(t('permissions.feedback.updateFailed', { ns: 'common' }))
    }
  }, [updateExpiry, t])

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-[640px] max-w-none p-6">
        <div className="mb-4 flex items-start justify-between gap-4 pr-8">
          <h2 className="title-lg-semi-bold text-text-primary">
            {t('permissions.whitelistModal.title', { ns: 'common', appName })}
          </h2>
        </div>

        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-background-section p-4">
          <div className="flex flex-col gap-1">
            <label className="system-sm-medium text-text-secondary">
              {t('permissions.whitelistModal.userId', { ns: 'common' })}
            </label>
            <Input
              value={userIdsRaw}
              onChange={e => setUserIdsRaw(e.target.value)}
              placeholder={t('permissions.whitelistModal.userIdPlaceholder', { ns: 'common' })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="system-sm-medium text-text-secondary">
              {t('permissions.whitelistModal.expiresAt', { ns: 'common' })}
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              placeholder={t('permissions.whitelistModal.expiresAtPlaceholder', { ns: 'common' })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              {t('permissions.whitelistModal.cancel', { ns: 'common' })}
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={isSubmitting} disabled={isSubmitting}>
              {t('permissions.whitelistModal.save', { ns: 'common' })}
            </Button>
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder={t('permissions.whitelistModal.sessionIdFilterPlaceholder', { ns: 'common' })}
            wrapperClassName="flex-1"
          />
          <span className="system-xs-regular text-text-tertiary">
            {t('permissions.whitelistModal.filterCount', {
              ns: 'common',
              shown: filteredEntries.length,
              total: entries.length,
            })}
          </span>
        </div>

        <div className="max-h-[280px] overflow-y-auto rounded-lg border border-divider-regular">
          {isPending
            ? (
                <div className="flex h-32 items-center justify-center">
                  <Loading type="area" />
                </div>
              )
            : filteredEntries.length === 0
              ? (
                  <div className="flex h-32 items-center justify-center system-sm-regular text-text-tertiary">
                    {filter.trim()
                      ? t('permissions.whitelistModal.filterEmpty', { ns: 'common' })
                      : t('permissions.whitelistModal.empty', { ns: 'common' })}
                  </div>
                )
              : (
                  <ul className="divide-y divide-divider-subtle">
                    {filteredEntries.map(entry => (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono system-sm-regular text-text-primary">
                            {entry.user_id}
                          </div>
                          <div className="system-xs-regular text-text-tertiary">
                            {entry.expires_at
                              ? `${t('permissions.whitelistModal.expiresAt', { ns: 'common' })}: ${entry.expires_at}`
                              : t('permissions.whitelistModal.never', { ns: 'common' })}
                          </div>
                        </div>
                        <Input
                          type="date"
                          value={entry.expires_at ?? ''}
                          onChange={e => handleUpdateExpiry(entry.id, e.target.value)}
                          wrapperClassName="w-[160px]"
                        />
                        <Button
                          variant="tertiary"
                          tone="destructive"
                          size="small"
                          onClick={() => {
                            if (window.confirm(t('permissions.whitelistModal.confirmDelete', { ns: 'common' })))
                              handleRevoke(entry.id)
                          }}
                        >
                          {t('permissions.whitelistModal.delete', { ns: 'common' })}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default React.memo(WhitelistModal)
