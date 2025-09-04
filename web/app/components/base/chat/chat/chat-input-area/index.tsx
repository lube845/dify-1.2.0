import {
  useCallback,
  useRef,
  useState,
} from 'react'
import Textarea from 'react-textarea-autosize'
import { useTranslation } from 'react-i18next'
import Recorder from 'js-audio-recorder'
import type {
  EnableType,
  OnSend,
} from '../../types'
import type { Theme } from '../../embedded-chatbot/theme/theme-context'
import type { InputForm } from '../type'
import { useCheckInputsForms } from '../check-input-forms-hooks'
import { useTextAreaHeight } from './hooks'
import Operation from './operation'
import cn from '@/utils/classnames'
import { FileListInChatInput } from '@/app/components/base/file-uploader'
import { useFile } from '@/app/components/base/file-uploader/hooks'
import {
  FileContextProvider,
  useFileStore,
} from '@/app/components/base/file-uploader/store'
import VoiceInput from '@/app/components/base/voice-input'
import { useToastContext } from '@/app/components/base/toast'
import FeatureBar from '@/app/components/base/features/new-feature-panel/feature-bar'
import type { FileUpload } from '@/app/components/base/features/types'
import { TransferMethod } from '@/types/app'

type ChatInputAreaProps = {
  showFeatureBar?: boolean
  showFileUpload?: boolean
  featureBarDisabled?: boolean
  onFeatureBarClick?: (state: boolean) => void
  visionConfig?: FileUpload
  speechToTextConfig?: EnableType
  onSend?: OnSend
  inputs?: Record<string, any>
  inputsForm?: InputForm[]
  theme?: Theme | null
  isResponding?: boolean
  disabled?: boolean
  onInputChange?: (variable: string, value: any) => void
}

const ChatInputArea = ({
  showFeatureBar,
  showFileUpload,
  featureBarDisabled,
  onFeatureBarClick,
  visionConfig,
  speechToTextConfig = { enabled: true },
  onSend,
  inputs = {},
  inputsForm = [],
  theme,
  isResponding,
  disabled,
  onInputChange,
}: ChatInputAreaProps) => {
  const { t } = useTranslation()
  const { notify } = useToastContext()
  const {
    wrapperRef,
    textareaRef,
    textValueRef,
    holdSpaceRef,
    handleTextareaResize,
    isMultipleLine,
  } = useTextAreaHeight()
  const [query, setQuery] = useState('')
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const filesStore = useFileStore()
  const {
    handleDragFileEnter,
    handleDragFileLeave,
    handleDragFileOver,
    handleDropFile,
    handleClipboardPasteFile,
    isDragActive,
  } = useFile(visionConfig!)
  const { checkInputsForm } = useCheckInputsForms()
  const historyRef = useRef([''])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const isComposingRef = useRef(false)

  // 检查是否为布尔类型的下拉选择
  const isBooleanSelect = (form: any) => {
    return form.options && form.options.length === 2 && 
           ((form.options.includes('true') && form.options.includes('false')) || 
            (form.options.includes('True') && form.options.includes('False')))
  }

  // 获取需要在输入框中显示的ToggleButton
  const toggleButtonForms = inputsForm.filter(form => 
    form.type === 'select' && isBooleanSelect(form)
  )

  // 处理ToggleButton点击事件
  const handleToggleButtonClick = useCallback((variable: string, currentValue: any) => {
    // 确保状态切换逻辑正确
    const isCurrentlyActive = currentValue === 'true' || currentValue === true || currentValue === 'True'
    const newValue = isCurrentlyActive ? 'false' : 'true'
    
    // 调用父组件的输入变化处理函数
    if (onInputChange) {
      onInputChange(variable, newValue)
    }
  }, [onInputChange])

  // 获取ToggleButton的激活状态
  const getToggleButtonActiveState = useCallback((variable: string) => {
    const value = inputs?.[variable]
    return value === 'true' || value === true || value === 'True'
  }, [inputs])

  const handleSend = () => {
    if (isResponding) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return
    }

    if (onSend) {
      const { files, setFiles } = filesStore.getState()
      if (files.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) {
        notify({ type: 'info', message: t('appDebug.errorMessage.waitForFileUpload') })
        return
      }
      if (!query || !query.trim()) {
        notify({ type: 'info', message: t('appAnnotation.errorMessage.queryRequired') })
        return
      }
      if (checkInputsForm(inputs, inputsForm)) {
        onSend(query, files)
        setQuery('')
        setFiles([])
      }
    }
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = () => {
    setTimeout(() => {
      isComposingRef.current = false
    }, 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (isComposingRef.current) return
      e.preventDefault()
      setQuery(query.replace(/\n$/, ''))
      historyRef.current.push(query)
      setCurrentIndex(historyRef.current.length)
      handleSend()
    }
    else if (e.key === 'ArrowUp' && !e.shiftKey && !e.nativeEvent.isComposing && e.metaKey) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        setQuery(historyRef.current[currentIndex - 1])
      }
    }
    else if (e.key === 'ArrowDown' && !e.shiftKey && !e.nativeEvent.isComposing && e.metaKey) {
      if (currentIndex < historyRef.current.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setQuery(historyRef.current[currentIndex + 1])
      }
      else if (currentIndex === historyRef.current.length - 1) {
        setCurrentIndex(historyRef.current.length)
        setQuery('')
      }
    }
  }

  const handleShowVoiceInput = useCallback(() => {
    (Recorder as any).getPermission().then(() => {
      setShowVoiceInput(true)
    }, () => {
      notify({ type: 'error', message: t('common.voiceInput.notAllow') })
    })
  }, [t, notify])

  const operation = (
    <Operation
      ref={holdSpaceRef}
      fileConfig={visionConfig}
      speechToTextConfig={speechToTextConfig}
      onShowVoiceInput={handleShowVoiceInput}
      onSend={handleSend}
      theme={theme}
    />
  )

  return (
    <>
      <div
        className={cn(
          'relative z-10 rounded-xl border border-components-chat-input-border bg-components-panel-bg-blur pb-[9px] shadow-md',
          isDragActive && 'border border-dashed border-components-option-card-option-selected-border',
          disabled && 'pointer-events-none border-components-panel-border opacity-50 shadow-none',
        )}
      >
        <div className='relative max-h-[158px] overflow-y-auto overflow-x-hidden px-[9px] pt-[9px]'>
          <FileListInChatInput fileConfig={visionConfig!} />
          
          {/* 输入框区域 - 单独一行，不包含任何按钮 */}
          <div
            ref={wrapperRef}
            className='flex items-center justify-between'
          >
            <div className='relative flex w-full grow items-center'>
              <div
                ref={textValueRef}
                className='body-lg-regular pointer-events-none invisible absolute h-auto w-auto whitespace-pre p-1 leading-6'
              >
                {query}
              </div>
              <Textarea
                ref={ref => textareaRef.current = ref as any}
                className={cn(
                  'body-lg-regular w-full resize-none bg-transparent p-1 leading-6 text-text-tertiary outline-none',
                )}
                placeholder={t('common.chat.inputPlaceholder') || ''}
                autoFocus
                minRows={1}
                onResize={handleTextareaResize}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setTimeout(handleTextareaResize, 0)
                }}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onPaste={handleClipboardPasteFile}
                onDragEnter={handleDragFileEnter}
                onDragLeave={handleDragFileLeave}
                onDragOver={handleDragFileOver}
                onDrop={handleDropFile}
              />
            </div>
          </div>
          
          {/* 底部操作栏 - ToggleButton 在左侧，所有操作按钮在右侧 */}
          <div className='flex items-center justify-between mt-2 pt-2'>
            {/* 左侧 ToggleButton 区域 */}
            <div className='flex items-center gap-2'>
              {toggleButtonForms.map(form => {
                const isActive = getToggleButtonActiveState(form.variable)
                return (
                  <div 
                    key={form.variable} 
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer select-none transition-all duration-200 hover:shadow-sm whitespace-nowrap',
                      isActive 
                        ? 'bg-primary-50 border-primary-200 text-primary-700' 
                        : 'bg-components-panel-bg border-components-panel-border text-text-secondary hover:border-primary-200 hover:bg-primary-25'
                    )}
                    onClick={() => handleToggleButtonClick(form.variable, inputs?.[form.variable])}
                  >
                    <span className={cn(
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-primary-700' : 'text-text-secondary'
                    )}>
                      {form.label}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* 右侧操作按钮区域 - 始终显示 */}
            <div className='shrink-0'>
              {operation}
            </div>
          </div>
          
          {/* 语音输入 */}
          {showVoiceInput && (
            <VoiceInput
              onCancel={() => setShowVoiceInput(false)}
              onConverted={text => setQuery(text)}
            />
          )}
        </div>
      </div>
      {showFeatureBar && <FeatureBar showFileUpload={showFileUpload} disabled={featureBarDisabled} onFeatureBarClick={onFeatureBarClick} />}
    </>
  )
}

const ChatInputAreaWrapper = (props: ChatInputAreaProps) => {
  return (
    <FileContextProvider>
      <ChatInputArea {...props} />
    </FileContextProvider>
  )
}

export default ChatInputAreaWrapper