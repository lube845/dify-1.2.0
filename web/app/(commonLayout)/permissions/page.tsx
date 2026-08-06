'use client'

import type { FC } from 'react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Permissions from '@/app/components/permissions'
import useDocumentTitle from '@/hooks/use-document-title'

const PermissionsPage: FC = () => {
  const { t } = useTranslation()
  useDocumentTitle(t('permissions.title', { ns: 'common' }))

  return <Permissions />
}

export default React.memo(PermissionsPage)
