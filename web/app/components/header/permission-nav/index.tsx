'use client'

import * as React from 'react'
import { cn } from '@langgenius/dify-ui/cn'
import {
  RiShieldKeyholeFill,
  RiShieldKeyholeLine,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import Link from '@/next/link'
import { useSelectedLayoutSegment } from '@/next/navigation'

type PermissionNavProps = {
  className?: string
}

const PermissionNav = ({
  className,
}: PermissionNavProps) => {
  const { t } = useTranslation()
  const selectedSegment = useSelectedLayoutSegment()
  const activated = selectedSegment === 'permissions'

  return (
    <Link
      href="/permissions"
      className={cn(
        'group text-sm font-medium',
        activated && 'hover:bg-components-main-nav-nav-button-bg-active-hover bg-components-main-nav-nav-button-bg-active font-semibold shadow-md',
        activated ? 'text-components-main-nav-nav-button-text-active' : 'text-components-main-nav-nav-button-text hover:bg-components-main-nav-nav-button-bg-hover',
        className,
      )}
    >
      {
        activated
          ? <RiShieldKeyholeFill className="h-4 w-4" />
          : <RiShieldKeyholeLine className="h-4 w-4" />
      }
      <div className="ml-2 max-[1024px]:hidden">
        {t('menus.permissions', { ns: 'common' })}
      </div>
    </Link>
  )
}

export default React.memo(PermissionNav)
