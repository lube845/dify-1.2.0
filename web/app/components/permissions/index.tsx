'use client'

import * as React from 'react'
import { useTranslation } from 'react-i18next'
import PermissionsTable from './table'

const Permissions = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background-body px-12 pt-8 pb-12">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="title-2xl-semi-bold text-text-primary">
          {t('permissions.title', { ns: 'common' })}
        </h1>
        <p className="system-sm-regular text-text-tertiary">
          {t('permissions.subtitle', { ns: 'common' })}
        </p>
      </header>
      <PermissionsTable />
    </div>
  )
}

export default React.memo(Permissions)
