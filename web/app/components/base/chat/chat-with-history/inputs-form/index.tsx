import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Message3Fill } from '@/app/components/base/icons/src/public/other'
import Button from '@/app/components/base/button'
import Divider from '@/app/components/base/divider'
import InputsFormContent from '@/app/components/base/chat/chat-with-history/inputs-form/content'
import { useChatWithHistoryContext } from '../context'
import cn from '@/utils/classnames'
import { InputVarType } from '@/app/components/workflow/types'

type Props = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const InputsFormNode = ({
  collapsed,
  setCollapsed,
}: Props) => {
  const { t } = useTranslation()
  const {
    isMobile,
    currentConversationId,
    handleStartChat,
    themeBuilder,
    inputsForms,
  } = useChatWithHistoryContext()

  // 是否存在可渲染的表单项（排除布尔型下拉：它们在聊天输入框中用 Toggle 展示）
  const hasRenderableForm = useMemo(() => {
    const isBooleanSelect = (form: any) => {
      return form?.type === InputVarType.select && form.options && form.options.length === 2 && (
        (form.options.includes('true') && form.options.includes('false')) ||
        (form.options.includes('True') && form.options.includes('False'))
      )
    }
    return inputsForms.some(form => !isBooleanSelect(form))
  }, [inputsForms])

  if (!hasRenderableForm)
    return null

  return (
    <div className={cn(
      'w-full max-w-[672px] mx-auto rounded-2xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-md',
      collapsed && 'border border-components-card-border bg-components-card-bg shadow-none',
    )}>
      <div className={cn(
        'flex items-center gap-3 rounded-t-2xl px-6 py-4',
        !collapsed && 'border-b border-divider-subtle',
        isMobile && 'px-4 py-3',
      )}>
        <Message3Fill className='h-6 w-6 shrink-0' />
        <div className='system-xl-semibold grow text-text-secondary'>{t('share.chat.chatSettingsTitle')}</div>
        {collapsed && (
          <Button className='uppercase text-text-tertiary' size='small' variant='ghost' onClick={() => setCollapsed(false)}>{t('common.operation.edit')}</Button>
        )}
        {!collapsed && currentConversationId && (
          <Button className='uppercase text-text-tertiary' size='small' variant='ghost' onClick={() => setCollapsed(true)}>{t('common.operation.close')}</Button>
        )}
      </div>
      {!collapsed && (
        <div className={cn('p-6', isMobile && 'p-4')}>
          <InputsFormContent />
        </div>
      )}
      {!collapsed && !currentConversationId && (
        <div className={cn('p-6', isMobile && 'p-4')}>
          <Button
            variant='primary'
            className='w-full'
            onClick={() => handleStartChat(() => setCollapsed(true))}
            style={
              themeBuilder?.theme
                ? {
                  backgroundColor: themeBuilder?.theme.primaryColor,
                }
                : {}
            }
          >{t('share.chat.startChat')}</Button>
        </div>
      )}
    </div>
  )
}

export default InputsFormNode