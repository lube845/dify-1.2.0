// inputs-form/content.tsx (修改后的版本)
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatWithHistoryContext } from '../context'
import Input from '@/app/components/base/input'
import Textarea from '@/app/components/base/textarea'
import { PortalSelect } from '@/app/components/base/select'
import { FileUploaderInAttachmentWrapper } from '@/app/components/base/file-uploader'
import { InputVarType } from '@/app/components/workflow/types'

type Props = {
  showTip?: boolean
}

const InputsFormContent = ({ showTip }: Props) => {
  const { t } = useTranslation()
  const {
    appParams,
    inputsForms,
    currentConversationId,
    currentConversationInputs,
    setCurrentConversationInputs,
    newConversationInputs,
    newConversationInputsRef,
    handleNewConversationInputsChange,
  } = useChatWithHistoryContext()
  const inputsFormValue = currentConversationId ? currentConversationInputs : newConversationInputs

  const handleFormChange = useCallback((variable: string, value: any) => {
    setCurrentConversationInputs({
      ...currentConversationInputs,
      [variable]: value,
    })
    handleNewConversationInputsChange({
      ...newConversationInputsRef.current,
      [variable]: value,
    })
  }, [newConversationInputsRef, handleNewConversationInputsChange, currentConversationInputs, setCurrentConversationInputs])

  // 检查是否为布尔类型的下拉选择
  const isBooleanSelect = (form: any) => {
    return form.options && form.options.length === 2 && 
           ((form.options.includes('true') && form.options.includes('false')) || 
            (form.options.includes('True') && form.options.includes('False')) )
  }

  return (
    <div className='space-y-4'>
      {inputsForms.map(form => {
        // 如果是布尔类型的选择，不在这里显示，而是在聊天输入框中显示
        if (form.type === InputVarType.select && isBooleanSelect(form)) {
          return null
        }
        
        return (
          <div key={form.variable} className='space-y-1'>
            <div className='flex h-6 items-center gap-1'>
              <div className='system-md-semibold text-text-secondary'>{form.label}</div>
              {!form.required && (
                <div className='system-xs-regular text-text-tertiary'>{t('appDebug.variableTable.optional')}</div>
              )}
            </div>
            
            {form.type === InputVarType.textInput && (
              <div className='space-y-2'>
                <Input
                  value={inputsFormValue?.[form.variable] || ''}
                  onChange={e => handleFormChange(form.variable, e.target.value)}
                  placeholder={form.label}
                />
              </div>
            )}
            
            {form.type === InputVarType.number && (
              <div className='space-y-2'>
                <Input
                  type='number'
                  value={inputsFormValue?.[form.variable] || ''}
                  onChange={e => handleFormChange(form.variable, e.target.value)}
                  placeholder={form.label}
                />
              </div>
            )}
            
            {form.type === InputVarType.paragraph && (
              <div className='space-y-2'>
                <Textarea
                  value={inputsFormValue?.[form.variable] || ''}
                  onChange={e => handleFormChange(form.variable, e.target.value)}
                  placeholder={form.label}
                />
              </div>
            )}
            
            {form.type === InputVarType.select && (
              <div className='space-y-2'>
                {/* 普通下拉选择（非布尔类型） */}
                <PortalSelect
                  popupClassName='w-[200px]'
                  value={inputsFormValue?.[form.variable]}
                  items={form.options.map((option: string) => ({ value: option, name: option }))}
                  onSelect={item => handleFormChange(form.variable, item.value as string)}
                  placeholder={form.label}
                />
              </div>
            )}
            
            {form.type === InputVarType.singleFile && (
              <div className='space-y-2'>
                <FileUploaderInAttachmentWrapper
                  value={inputsFormValue?.[form.variable] ? [inputsFormValue?.[form.variable]] : []}
                  onChange={files => handleFormChange(form.variable, files[0])}
                  fileConfig={{
                    allowed_file_types: form.allowed_file_types,
                    allowed_file_extensions: form.allowed_file_extensions,
                    allowed_file_upload_methods: form.allowed_file_upload_methods,
                    number_limits: 1,
                    fileUploadConfig: (appParams as any).system_parameters,
                  }}
                />
              </div>
            )}
            
            {form.type === InputVarType.multiFiles && (
              <div className='space-y-2'>
                <FileUploaderInAttachmentWrapper
                  value={inputsFormValue?.[form.variable] || []}
                  onChange={files => handleFormChange(form.variable, files)}
                  fileConfig={{
                    allowed_file_types: form.allowed_file_types,
                    allowed_file_extensions: form.allowed_file_extensions,
                    allowed_file_upload_methods: form.allowed_file_upload_methods,
                    number_limits: form.max_length,
                    fileUploadConfig: (appParams as any).system_parameters,
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
      {showTip && (
        <div className='system-xs-regular text-text-tertiary'>{t('share.chat.chatFormTip')}</div>
      )}
    </div>
  )
}

export default InputsFormContent