import React from 'react'
import cn from '@/utils/classnames'

interface ToggleButtonProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  className?: string
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  value,
  onChange,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        // 基础样式
        'relative inline-flex items-center justify-center',
        'px-4 py-2 rounded-lg border transition-all duration-200',
        'font-medium text-sm cursor-pointer',
        // 未选中状态
        !value && [
          'border-components-button-secondary-border',
          'bg-components-button-secondary-bg',
          'text-components-button-secondary-text',
          'hover:bg-components-button-secondary-bg-hover',
          'hover:border-components-button-secondary-border-hover',
        ],
        // 选中状态（高亮）
        value && [
          'border-components-button-primary-border',
          'bg-components-button-primary-bg',
          'text-components-button-primary-text',
          'shadow-sm',
        ],
        className
      )}
    >
      <span className="relative z-10">
        {label}
      </span>
      {/* 选中状态的背景效果 */}
      {value && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
      )}
    </button>
  )
}

export default ToggleButton