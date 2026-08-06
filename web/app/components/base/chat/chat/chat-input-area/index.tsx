import type { Theme } from '../../embedded-chatbot/theme/theme-context'
import type { EnableType, OnSend } from '../../types'
import type { InputForm } from '../type'
import type { FileUpload } from '@/app/components/base/features/types'
import { cn } from '@langgenius/dify-ui/cn'
import { toast } from '@langgenius/dify-ui/toast'
import { RiErrorWarningFill } from '@remixicon/react'
import { noop } from 'es-toolkit/function'
import { decode } from 'html-entities'
import Recorder from 'js-audio-recorder'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Textarea from 'react-textarea-autosize'
import FeatureBar from '@/app/components/base/features/new-feature-panel/feature-bar'
import { FileListInChatInput } from '@/app/components/base/file-uploader'
import { useFile } from '@/app/components/base/file-uploader/hooks'
import { FileContextProvider, useFileStore } from '@/app/components/base/file-uploader/store'
import VoiceInput from '@/app/components/base/voice-input'
import { InputVarType } from '@/app/components/workflow/types'
import { TransferMethod } from '@/types/app'
import { useCheckInputsForms } from '../check-input-forms-hooks'
import { useTextAreaHeight } from './hooks'
import Operation from './operation'
import ToggleButton from './toggle-button'

const isBooleanSelect = (form: InputForm) => {
  if (form?.type !== InputVarType.select)
    return false
  const options = form.options as string[] | undefined
  if (!options || options.length !== 2)
    return false
  return (
    (options.includes('true') && options.includes('false'))
    || (options.includes('True') && options.includes('False'))
  )
}

type ChatInputAreaProps = {
  readonly?: boolean
  botName?: string
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
  /**
   * Controls whether pressing Enter sends the message.
   * - true (default): Enter sends, Shift+Enter inserts newline
   * - false: Enter inserts newline, Shift+Enter sends
   * Useful for CJK (Japanese/Korean/Chinese) IME users who expect Enter to insert newlines.
   */
  sendOnEnter?: boolean
  onInputChange?: (variable: string, value: any) => void
}
const ChatInputArea = ({ readonly, botName, showFeatureBar, showFileUpload, featureBarDisabled, onFeatureBarClick, visionConfig, speechToTextConfig = { enabled: true }, onSend, inputs = {}, inputsForm = [], theme, isResponding, disabled, sendOnEnter = true, onInputChange }: ChatInputAreaProps) => {
  const { t } = useTranslation()
  const { wrapperRef, textareaRef, textValueRef, holdSpaceRef, handleTextareaResize, isMultipleLine } = useTextAreaHeight()
  const [query, setQuery] = useState('')
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const filesStore = useFileStore()
  const { handleDragFileEnter, handleDragFileLeave, handleDragFileOver, handleDropFile, handleClipboardPasteFile, isDragActive } = useFile(visionConfig!, false)
  const { checkInputsForm } = useCheckInputsForms()
  const historyRef = useRef([''])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const isComposingRef = useRef(false)
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setTimeout(handleTextareaResize, 0)
  }, [handleTextareaResize])
  const handleSend = () => {
    if (isResponding) {
      toast.info(t('errorMessage.waitForResponse', { ns: 'appDebug' }))
      return
    }
    if (onSend) {
      const { files, setFiles } = filesStore.getState()
      if (files.some(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) {
        toast.info(t('errorMessage.waitForFileUpload', { ns: 'appDebug' }))
        return
      }
      if (!query || !query.trim()) {
        toast.info(t('errorMessage.queryRequired', { ns: 'appAnnotation' }))
        return
      }
      if (checkInputsForm(inputs, inputsForm)) {
        onSend(query, files)
        handleQueryChange('')
        setFiles([])
      }
    }
  }
  const handleCompositionStart = () => {
    // e: React.CompositionEvent<HTMLTextAreaElement>
    isComposingRef.current = true
  }
  const handleCompositionEnd = () => {
    // safari or some browsers will trigger compositionend before keydown.
    // delay 50ms for safari.
    setTimeout(() => {
      isComposingRef.current = false
    }, 50)
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Determine if this key combo should trigger send:
    // sendOnEnter=true (default): Enter sends, Shift+Enter inserts newline
    // sendOnEnter=false: Shift+Enter sends, Enter inserts newline
    const isSendCombo = sendOnEnter
      ? (e.key === 'Enter' && !e.shiftKey)
      : (e.key === 'Enter' && e.shiftKey)
    if (isSendCombo && !e.nativeEvent.isComposing) {
      // if isComposing, exit
      if (isComposingRef.current)
        return
      e.preventDefault()
      setQuery(query.replace(/\n$/, ''))
      historyRef.current.push(query)
      setCurrentIndex(historyRef.current.length)
      handleSend()
    }
    else if (e.key === 'ArrowUp' && !e.shiftKey && !e.nativeEvent.isComposing && e.metaKey) {
      // When the cmd + up key is pressed, output the previous element
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
        handleQueryChange(historyRef.current[currentIndex - 1]!)
      }
    }
    else if (e.key === 'ArrowDown' && !e.shiftKey && !e.nativeEvent.isComposing && e.metaKey) {
      // When the cmd + down key is pressed, output the next element
      if (currentIndex < historyRef.current.length - 1) {
        setCurrentIndex(currentIndex + 1)
        handleQueryChange(historyRef.current[currentIndex + 1]!)
      }
      else if (currentIndex === historyRef.current.length - 1) {
        // If it is the last element, clear the input box
        setCurrentIndex(historyRef.current.length)
        handleQueryChange('')
      }
    }
  }
  const handleShowVoiceInput = useCallback(() => {
    (Recorder as any).getPermission().then(() => {
      setShowVoiceInput(true)
    }, () => {
      toast.error(t('voiceInput.notAllow', { ns: 'common' }))
    })
  }, [t])
  const operation = (<Operation ref={holdSpaceRef} readonly={readonly} fileConfig={visionConfig} speechToTextConfig={speechToTextConfig} onShowVoiceInput={handleShowVoiceInput} onSend={handleSend} theme={theme} />)
  const toggleButtonForms = useMemo(
    () => (inputsForm || []).filter(isBooleanSelect),
    [inputsForm],
  )
  const handleToggleChange = useCallback((variable: string, currentValue: any) => {
    const isCurrentlyActive = currentValue === 'true' || currentValue === true || currentValue === 'True'
    const newValue = isCurrentlyActive ? 'false' : 'true'
    onInputChange?.(variable, newValue)
  }, [onInputChange])
  return (
    <>
      <div className={cn('relative z-10 overflow-hidden rounded-xl border border-components-chat-input-border bg-components-panel-bg-blur pb-[9px] shadow-md', isDragActive && 'border border-dashed border-components-option-card-option-selected-border', disabled && 'pointer-events-none border-components-panel-border opacity-50 shadow-none')}>
        <div className="relative max-h-[158px] overflow-x-hidden overflow-y-auto px-[9px] pt-[9px]">
          <FileListInChatInput fileConfig={visionConfig!} />
          <div ref={wrapperRef} className="flex items-center justify-between">
            <div className="relative flex w-full grow items-center">
              <div ref={textValueRef} className="pointer-events-none invisible absolute h-auto w-auto p-1 body-lg-regular leading-6 whitespace-pre">
                {query}
              </div>
              <Textarea ref={ref => textareaRef.current = ref as any} className={cn('w-full resize-none bg-transparent p-1 body-lg-regular leading-6 text-text-primary outline-hidden')} placeholder={decode(t(readonly ? 'chat.inputDisabledPlaceholder' : 'chat.inputPlaceholder', { ns: 'common', botName }) || '')} autoFocus minRows={1} value={query} onChange={e => handleQueryChange(e.target.value)} onKeyDown={handleKeyDown} onCompositionStart={handleCompositionStart} onCompositionEnd={handleCompositionEnd} onPaste={handleClipboardPasteFile} onDragEnter={handleDragFileEnter} onDragLeave={handleDragFileLeave} onDragOver={handleDragFileOver} onDrop={handleDropFile} readOnly={readonly} />
            </div>
            {!isMultipleLine && operation}
          </div>
          {showVoiceInput && (<VoiceInput onCancel={() => setShowVoiceInput(false)} onConverted={text => handleQueryChange(text)} />)}
        </div>
        {toggleButtonForms.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-[9px] pt-1 pb-2">
            {toggleButtonForms.map((form) => {
              const currentValue = inputs?.[form.variable]
              const isActive = currentValue === 'true' || currentValue === true || currentValue === 'True'
              return (
                <ToggleButton
                  key={form.variable}
                  label={form.label}
                  value={isActive}
                  onChange={() => handleToggleChange(form.variable, currentValue)}
                />
              )
            })}
          </div>
        )}
        {isMultipleLine && (<div className="px-[9px]">{operation}</div>)}
      </div>
      <div className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-md border border-state-destructive-border bg-state-destructive-hover px-3 py-1.5 system-sm-medium text-text-destructive">
        <RiErrorWarningFill className="h-4 w-4 shrink-0" />
        <span>{t('chat.aiGeneratedDisclaimer', { ns: 'common' })}</span>
      </div>
      {showFeatureBar && (<FeatureBar showFileUpload={showFileUpload} disabled={featureBarDisabled} onFeatureBarClick={readonly ? noop : onFeatureBarClick} hideEditEntrance={readonly} />)}
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
