import ipaddress
import socket
from typing import Optional
from urllib.parse import urlparse
import json

with open('/app/allowed_remote_ips.json', 'r') as f:
    ALLOWED_REMOTE_IPS = json.load(f)

ALLOWED_NETWORKS = [ipaddress.ip_network(cidr) for cidr in ALLOWED_REMOTE_IPS.values()]


def get_url_ip(url: str) -> Optional[str]:
    """解析URL的域名，获取其IPv4地址。"""
    try:
        parsed_url = urlparse(url)
        hostname = parsed_url.hostname
        
        if not hostname:
            return None

        # 使用 socket.gethostbyname 解析域名到 IPv4 地址
        ip_addr = socket.gethostbyname(hostname)
        return ip_addr
    except socket.gaierror:
        # 域名解析失败
        return None
    except Exception:
        # 其他错误
        return None
    return None


def check_ssrf_risk(url: str) -> bool:
    """
    检查URL是否指向白名单IP以外的地址。
    返回 True 表示存在SSRF风险（应被禁止）。
    """
    
    # 1. 检查 URL 协议
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        # 仅允许 HTTP/HTTPS 协议
        return True 
    
    # 2. 获取并检查解析后的 IP 地址
    ip_addr = get_url_ip(url)
    
    if ip_addr is None:
        # 域名无法解析：在严格白名单模式下，无法解析的域名通常也应该被禁止
        return True 
    
    try:
        ip = ipaddress.ip_address(ip_addr)
        
        # 遍历白名单网络段
        for net in ALLOWED_NETWORKS:
            if ip in net:
                return False # 找到了，**允许访问** (返回 False 表示无风险)
                
        # 如果代码执行到这里，说明 IP 不在任何白名单内，禁止访问
        return True 
    except ValueError:
        # IP 地址无效，禁止
        return True