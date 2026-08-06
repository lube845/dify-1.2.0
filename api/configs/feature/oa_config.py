from pydantic import Field
from pydantic_settings import BaseSettings


class OAConfig(BaseSettings):
    """
    Configuration for the OA (corporate intranet) authentication integration.

    Used by `api/libs/oa_auth.py` and `api/controllers/web/oa_auth.py` to gate
    access to webapp chat routes with an OA account-password check.
    """

    OA_BASE_URL: str = Field(
        description="Base URL of the OA system (e.g. http://oa.example.com:8000)",
        default="",
    )

    OA_SECRET_KEY: str = Field(
        description="Shared secret used by the OA system to sign SSO links",
        default="",
    )

    OA_API_IDENTIFIER: str = Field(
        description="API identifier issued by the OA admin page for HMAC-based API auth",
        default="",
    )

    OA_TIME_OFFSET_SECONDS: int = Field(
        description="Local clock offset vs the OA server, in seconds. Set if NTP drift is significant.",
        default=0,
    )

    OA_TOKEN_EXPIRE_MINUTES: int = Field(
        description="Validity window for SSO tokens, in minutes",
        default=5,
        ge=1,
    )

    OA_RSA_TIMEOUT_SECONDS: int = Field(
        description="HTTP timeout when calling OA checkLogin / RSA key endpoints",
        default=10,
        ge=1,
    )

    OA_SESSION_EXPIRE_HOURS: int = Field(
        description="Validity of the oa_session cookie issued after a successful OA login",
        default=8,
        ge=1,
    )

    OA_TEST_MODE: bool = Field(
        description=(
            "Local-test bypass for /api/oa/login. When True and OA_BASE_URL is "
            "empty, accepts admin/admin123 as a hard-coded credential so the "
            "chat gate can run without a real OA server. Default False. Must be "
            "False in production — leaving it True exposes a credentialed bypass."
        ),
        default=False,
    )
