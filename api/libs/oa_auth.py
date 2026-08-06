"""OA corporate-intranet authentication helpers.

Provides account/password login against the corporate OA system. Used by
``api/controllers/web/oa_auth.py`` to gate access to webapp chat routes.

Configuration is read from ``dify_config`` (env: ``OA_BASE_URL``,
``OA_SECRET_KEY``, ``OA_API_IDENTIFIER``, ``OA_RSA_TIMEOUT_SECONDS``, etc.).
"""

from __future__ import annotations

import base64
import hashlib
import json
import time
from typing import Any

import requests
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from configs import dify_config


def _oa_config() -> dict[str, Any]:
    return {
        "base_url": dify_config.OA_BASE_URL,
        "secret_key": dify_config.OA_SECRET_KEY,
        "api_identifier": dify_config.OA_API_IDENTIFIER,
        "time_offset_seconds": dify_config.OA_TIME_OFFSET_SECONDS,
        "token_expire_minutes": dify_config.OA_TOKEN_EXPIRE_MINUTES,
        "rsa_timeout_seconds": dify_config.OA_RSA_TIMEOUT_SECONDS,
    }


def is_oa_configured() -> bool:
    """Return True when the minimum OA config is present."""
    cfg = _oa_config()
    return bool(cfg["base_url"])


def verify_oa_sso_token(loginid: str, stamp: str, token: str) -> tuple[bool, str]:
    """Verify an SSO link token: SHA1(secret_key + loginid + stamp).

    Not wired into the current chat-gate flow, but kept for the SSO link use case.
    """
    cfg = _oa_config()
    try:
        time_offset_ms = cfg["time_offset_seconds"] * 1000
        current_timestamp = int(time.time() * 1000) - time_offset_ms
        stamp_int = int(stamp)
        time_diff_minutes = abs(current_timestamp - stamp_int) / 1000 / 60

        if time_diff_minutes > cfg["token_expire_minutes"]:
            return False, f"链接已过期（超过{cfg['token_expire_minutes']}分钟，时间差{time_diff_minutes:.1f}分钟）"

        raw_string = cfg["secret_key"] + loginid + stamp
        expected_token = hashlib.sha1(raw_string.encode()).hexdigest()

        if token.lower() != expected_token.lower():
            return False, "token验证失败，可能链接被篡改"

        return True, "验证成功"

    except ValueError:
        return False, "时间戳格式错误"
    except Exception as e:
        return False, f"验证过程出错: {e!s}"


def generate_api_token() -> dict[str, str]:
    """Generate an OA API token (key + ts). Not used by the chat-gate flow."""
    cfg = _oa_config()
    ts = str(int(time.time() * 1000))
    key_string = cfg["api_identifier"] + ts
    api_key = hashlib.md5(key_string.encode()).hexdigest().upper()
    return {"key": api_key, "ts": ts}


def get_user_info_from_oa(loginid: str) -> dict[str, str] | None:
    """Fetch employee profile from the OA API by workcode."""
    cfg = _oa_config()
    try:
        url = f"{cfg['base_url']}/api/hrm/resful/getHrmUserInfoWithPage"
        payload = {"params": {"pagesize": 1, "workcode": loginid}}
        headers = {"Content-Type": "application/json"}

        response = requests.post(url, headers=headers, json=payload, timeout=cfg["rsa_timeout_seconds"])
        if response.status_code != 200:
            return None

        result = response.json()
        if result.get("code") != "1":
            return None

        user_list = result.get("data", {}).get("dataList", [])
        if not user_list:
            return None

        user = user_list[0]
        return {
            "workcode": user.get("workcode", loginid),
            "name": user.get("lastname", "未知"),
            "department": user.get("departmentname", "未知"),
            "loginid": user.get("loginid", loginid),
            "subcompany": user.get("subcompanyname", ""),
            "jobtitle": user.get("jobtitle", ""),
            "email": user.get("email", ""),
            "mobile": user.get("mobile", ""),
            "status": user.get("status", ""),
        }
    except (requests.RequestException, json.JSONDecodeError, Exception):
        return None

def oa_login_with_password(loginid: str, password: str) -> tuple[bool, dict[str, str] | None, str]:
    """Authenticate against the OA checkLogin API using account + password.

    Returns (success, user_info, message). On success, user_info has
    ``workcode``, ``name``, ``department`` populated.
    """
    cfg = _oa_config()
    base_url = cfg["base_url"]
    timeout = cfg["rsa_timeout_seconds"]

    # Local-test bypass: only active when OA is not configured AND the operator
    # has explicitly opted in via OA_TEST_MODE. Default off, so a missing
    # OA_BASE_URL in production yields 401 instead of accepting any login.
    if dify_config.OA_TEST_MODE:
        if loginid == "admin" and password == "admin123":
            return True, {
                "workcode": "admin",
                "name": "admin",
                "department": "admin",
                "loginid": "000000",
                "subcompany": "local-test",
                "jobtitle": "admin",
                "email": "admin@local",
                "mobile": "",
                "status": "active",
            }, "登录成功"
        return False, None, "账号或密码错误"

    # Step 1: call checkLogin
    try:
        login_url = f"{base_url}/api/hrm/login/checkLogin"
        payload = {
            "loginid": loginid,
            "userpassword": password,
            "logintype": "1",
            "islangueid": "7",
            "isRememberPassword": "false",
            "validatecode": "",
            "validateCodeKey": "",
            "dynamicPassword": "",
            "messages": "",
            "isie": "false",
            "appid": "",
            "service": "",
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
        login_resp = requests.post(login_url, data=payload, headers=headers, timeout=timeout)
        login_resp.raise_for_status()
        result = login_resp.json()
    except Exception as e:
        return False, None, f"OA登录接口请求失败: {e}"

    login_ok = (
        str(result.get("loginstatus")).lower() == "true"
        or str(result.get("msgcode")) == "0"
        or str(result.get("code")) == "1"
    )
    if not login_ok:
        msg = result.get("msg") or result.get("message") or "账号或密码错误"
        return False, None, msg

    # Step 2: fetch user info
    user_info = get_user_info_from_oa(loginid)
    if user_info is None:
        return False, None, "登录成功但无法获取员工信息，请联系管理员"

    return True, user_info, "登录成功"


def oa_sso_login(loginid: str, stamp: str, token: str) -> tuple[bool, dict[str, str] | None, str]:
    """OA SSO link flow: verify the link token, then fetch user info."""
    is_valid, message = verify_oa_sso_token(loginid, stamp, token)
    if not is_valid:
        return False, None, message

    user_info = get_user_info_from_oa(loginid)
    if user_info is None:
        return False, None, f"无法从OA系统获取员工 {loginid} 的信息，可能该员工不存在"

    return True, user_info, "登录成功"