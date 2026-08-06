"""Unit tests for the new AppAccessPermission check in ``_validate_user_accessibility``.

Strategy: pass ``app_web_auth_enabled=False, system_webapp_auth_enabled=False`` so the
existing enterprise-webapp-auth branch short-circuits and we only exercise the
newly-added permission check at the end of the function.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from controllers.web.error import AppAccessPermissionDeniedError, WebAppPermissionExpiredError
from controllers.web.wraps import _validate_user_accessibility
from services.app_access_permission_service import AccessCheckResult, AppAccessPolicy


class TestAppAccessPermissionInValidateUserAccessibility:
    """Each test mocks ``AppAccessPermissionService.check_access_with_reason`` directly."""

    def _app(self, policy: str = AppAccessPolicy.ALLOW_ALL.value) -> MagicMock:
        a = MagicMock()
        a.id = "app-1"
        a.tenant_id = "tenant-1"
        a.access_policy = policy
        return a

    def _end_user(self, session_id: str = "user-123") -> MagicMock:
        u = MagicMock()
        u.session_id = session_id
        return u

    def _call(self, app: MagicMock, end_user: MagicMock) -> None:
        _validate_user_accessibility(
            decoded={},
            app_code="some-code",
            app_web_auth_enabled=False,
            system_webapp_auth_enabled=False,
            webapp_settings=None,
            app_model=app,
            end_user=end_user,
        )

    def test_allowed_does_not_raise(self) -> None:
        app = self._app(AppAccessPolicy.ALLOW_ALL.value)
        end_user = self._end_user()

        with patch(
            "controllers.web.wraps.AppAccessPermissionService.check_access_with_reason",
            return_value=AccessCheckResult.ALLOWED,
        ) as mock_check:
            self._call(app, end_user)

        mock_check.assert_called_once_with(app=app, end_user=end_user)

    def test_deny_all_explicit_with_permission_passes(self) -> None:
        app = self._app(AppAccessPolicy.DENY_ALL_EXPLICIT.value)
        end_user = self._end_user()

        with patch(
            "controllers.web.wraps.AppAccessPermissionService.check_access_with_reason",
            return_value=AccessCheckResult.ALLOWED,
        ):
            self._call(app, end_user)  # should not raise

    def test_deny_all_explicit_without_permission_raises_denied(self) -> None:
        # User is not on the allowlist at all -> "not authorised" page.
        app = self._app(AppAccessPolicy.DENY_ALL_EXPLICIT.value)
        end_user = self._end_user()

        with patch(
            "controllers.web.wraps.AppAccessPermissionService.check_access_with_reason",
            return_value=AccessCheckResult.DENIED,
        ):
            with pytest.raises(AppAccessPermissionDeniedError):
                self._call(app, end_user)

    def test_deny_all_explicit_with_expired_permission_raises_expired(self) -> None:
        # User *was* on the allowlist but their row's expires_at is in the past
        # -> "permission expired" page. The user can only recover via admin
        # renewal; this is distinct from the never-granted DENIED case above.
        app = self._app(AppAccessPolicy.DENY_ALL_EXPLICIT.value)
        end_user = self._end_user()

        with patch(
            "controllers.web.wraps.AppAccessPermissionService.check_access_with_reason",
            return_value=AccessCheckResult.EXPIRED,
        ):
            with pytest.raises(WebAppPermissionExpiredError):
                self._call(app, end_user)

    def test_check_is_called_for_both_policies(self) -> None:
        """The check fires regardless of policy; the policy is read by the service."""
        for policy in (
            AppAccessPolicy.ALLOW_ALL.value,
            AppAccessPolicy.DENY_ALL_EXPLICIT.value,
        ):
            app = self._app(policy)
            end_user = self._end_user()

            with patch(
                "controllers.web.wraps.AppAccessPermissionService.check_access_with_reason",
                return_value=AccessCheckResult.ALLOWED,
            ) as mock_check:
                self._call(app, end_user)

            mock_check.assert_called_once_with(app=app, end_user=end_user)
