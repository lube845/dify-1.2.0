import type { FC } from 'react'
import { cn } from '@langgenius/dify-ui/cn'

type ToggleButtonProps = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  className?: string
}

const ToggleButton: FC<ToggleButtonProps> = ({
  label,
  value,
  onChange,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      data-testid="chat-input-toggle-button"
      aria-pressed={value}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg border px-3 py-1.5 font-medium text-sm cursor-pointer transition-all duration-200',
        !value && [
          'border-components-button-secondary-border',
          'bg-components-button-secondary-bg',
          'text-components-button-secondary-text',
          'hover:border-components-button-secondary-border-hover',
          'hover:bg-components-button-secondary-bg-hover',
        ],
        value && [
          'border-components-button-primary-border',
          'bg-components-button-primary-bg',
          'text-components-button-primary-text',
          'shadow-xs',
        ],
        className,
      )}
    >
      <span className="relative z-10">{label}</span>
      {value && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
      )}
    </button>
  )
}

export default ToggleButton