'use client'

import { toast } from '@langgenius/dify-ui/toast'
import * as React from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AppUnavailable from '@/app/components/base/app-unavailable'
import Loading from '@/app/components/base/loading'
import { useWebAppStore } from '@/context/web-app-context'
import { usePathname, useRouter, useSearchParams } from '@/next/navigation'
import { useGetUserCanAccessApp } from '@/service/access-control'
import { useGetWebAppInfo, useGetWebAppMeta, useGetWebAppParams } from '@/service/use-share'
import { webAppLogout } from '@/service/webapp-auth'

const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation()
  const shareCode = useWebAppStore(s => s.shareCode)
  const updateAppInfo = useWebAppStore(s => s.updateAppInfo)
  const updateAppParams = useWebAppStore(s => s.updateAppParams)
  const updateWebAppMeta = useWebAppStore(s => s.updateWebAppMeta)
  const updateUserCanAccessApp = useWebAppStore(s => s.updateUserCanAccessApp)
  // All four fetches have their errors surfaced as a page-level AppUnavailable
  // (or the 403 "no permission" branch below). Suppress the global fetch hook
  // toast for them so the user only sees ONE clear message, not a stack of
  // per-query toasts.
  const { isFetching: isFetchingAppParams, data: appParams, error: appParamsError } = useGetWebAppParams({ silent: true })
  const { isFetching: isFetchingAppInfo, data: appInfo, error: appInfoError } = useGetWebAppInfo({ silent: true })
  const { isFetching: isFetchingAppMeta, data: appMeta, error: appMetaError } = useGetWebAppMeta({ silent: true })
  const { data: userCanAccessApp, error: useCanAccessAppError } = useGetUserCanAccessApp({ appId: appInfo?.app_id, isInstalledApp: false, silent: true })

  useEffect(() => {
    if (appInfo)
      updateAppInfo(appInfo)
    if (appParams)
      updateAppParams(appParams)
    if (appMeta)
      updateWebAppMeta(appMeta)
    updateUserCanAccessApp(Boolean(userCanAccessApp && userCanAccessApp?.result))
  }, [appInfo, appMeta, appParams, updateAppInfo, updateAppParams, updateUserCanAccessApp, updateWebAppMeta, userCanAccessApp])

  // Show a single "no permission" toast when the permission check fails
  // (either by 403/error, or by a 200 with result: false). A ref guard makes
  // sure we only fire it once per access denial, even if the queries retry.
  const noPermissionToastShownRef = useRef(false)
  const hasNoPermission = Boolean(useCanAccessAppError) || (userCanAccessApp ? !userCanAccessApp.result : false)
  useEffect(() => {
    if (hasNoPermission && !noPermissionToastShownRef.current) {
      noPermissionToastShownRef.current = true
      toast.error(t('webapp.accessDenied', { ns: 'common' }))
    }
    if (!hasNoPermission)
      noPermissionToastShownRef.current = false
  }, [hasNoPermission, t])

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const getSigninUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('message')
    const query = params.toString()
    const fullPath = query ? `${pathname}?${query}` : pathname
    params.set('redirect_url', fullPath)
    return `/webapp-signin?${params.toString()}`
  }, [searchParams, pathname])

  const backToHome = useCallback(async () => {
    await webAppLogout(shareCode!)
    const url = getSigninUrl()
    router.replace(url)
  }, [getSigninUrl, router, shareCode])

  if (appInfoError) {
    return (
      <div className="flex h-full items-center justify-center">
        <AppUnavailable unknownReason={appInfoError.message} />
      </div>
    )
  }
  if (appParamsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <AppUnavailable unknownReason={appParamsError.message} />
      </div>
    )
  }
  if (appMetaError) {
    return (
      <div className="flex h-full items-center justify-center">
        <AppUnavailable unknownReason={appMetaError.message} />
      </div>
    )
  }
  if (useCanAccessAppError) {
    return (
      <div className="flex h-full items-center justify-center">
        <AppUnavailable unknownReason={useCanAccessAppError.message} />
      </div>
    )
  }
  if (userCanAccessApp && !userCanAccessApp.result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-2">
        <AppUnavailable className="h-auto w-auto" code={403} unknownReason="no permission." />
        <span className="cursor-pointer system-sm-regular text-text-tertiary" onClick={backToHome}>{t('userProfile.logout', { ns: 'common' })}</span>
      </div>
    )
  }
  if (isFetchingAppInfo || isFetchingAppParams || isFetchingAppMeta) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }
  return <>{children}</>
}

export default React.memo(AuthenticatedLayout)
