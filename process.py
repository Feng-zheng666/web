<<<<<<< HEAD
import os
import re
import json
import base64
import socket
import requests
import time
from urllib.parse import urlparse

# 配置
# 在 GitHub Secrets 中设置 SUBSCRIBE_URL，或者直接在这里填入（不推荐公开）
SUBSCRIBE_URL = os.environ.get("SUBSCRIBE_URL", "你的订阅链接放在这里")
GEO_API_URL = "http://ip-api.com/batch" # 使用批量查询接口
TIMEOUT = 3 # 测速超时时间（秒）


def get_subscribe_urls():
    urls = []
    # 优先尝试读取本地的 urls.txt 文件
    if os.path.exists("urls.txt"):
        with open("urls.txt", "r") as f:
            urls = [line.strip() for line in f if line.strip()]
        print("Using URLs from local urls.txt")
    
    # 如果文件不存在或为空，则读取环境变量 (GitHub Secrets)
    if not urls:
        env_url = os.environ.get("SUBSCRIBE_URL")
        if env_url:
            urls = [env_url]
            print("Using URL from GitHub Secrets")
            
    return urls

# 在 main 函数中调用
# links = decode_subscription(get_subscribe_urls()[0]) ...

def get_runner_info():
    """获取当前 GitHub Runner 的真实 IP"""
    try:
        r = requests.get("http://ip-api.com/json/", timeout=5)
        return r.json()
    except:
        return {"query": "Unknown", "country": "Unknown", "city": "Unknown"}

def decode_subscription(url):
    """下载并解码 Base64 订阅"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        content = requests.get(url, headers=headers).text
        # 补全 padding
        padded = content + "=" * ((4 - len(content) % 4) % 4)
        decoded_bytes = base64.urlsafe_b64decode(padded)
        decoded_str = decoded_bytes.decode('utf-8')
        return decoded_str.splitlines()
    except Exception as e:
        print(f"Error decoding subscription: {e}")
        return []

def parse_node(link):
    """简单的节点解析 (仅支持 vmess/ss/trojan 的基本提取用于测速)"""
    # 这里为了演示，主要提取 IP 和端口进行 TCP 握手
    # 实际生产环境建议使用专门的库解析完整协议
    host = None
    port = None
    name = "Unknown Node"
    
    try:
        if link.startswith("vmess://"):
            # vmess 是 base64 编码的 json
            b64 = link[8:]
            padded = b64 + "=" * ((4 - len(b64) % 4) % 4)
            info = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            host = info.get('add')
            port = info.get('port')
            name = info.get('ps', 'Vmess Node')
        elif link.startswith("ss://"):
            # ss 解析逻辑简化
            if '@' in link:
                part = link.split('@')[1]
                host_port = part.split('#')[0].split(':')
                host = host_port[0]
                port = host_port[1]
                name = requests.utils.unquote(link.split('#')[1]) if '#' in link else "SS Node"
    except:
        pass
        
    return host, port, name, link

def tcp_latency(host, port):
    """TCP 握手测速"""
    if not host or not port:
        return -1
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(TIMEOUT)
    start = time.time()
    try:
        s.connect((host, int(port)))
        s.close()
        return int((time.time() - start) * 1000)
    except:
        return -1

def main():
    print("Starting process...")
    runner_info = get_runner_info()
    print(f"Runner IP: {runner_info['query']} ({runner_info['country']})")

    links = decode_subscription(SUBSCRIBE_URL)
    valid_nodes = []
    ips_to_query = []

    print(f"Found {len(links)} nodes provided. Testing connectivity...")

    for link in links:
        host, port, name, original_link = parse_node(link)
        if host and port:
            latency = tcp_latency(host, port)
            if latency != -1:
                # 只有通的节点才加入列表
                print(f"[OK] {latency}ms - {name}")
                
                # 判断 host 是域名还是 IP，如果是域名需解析为 IP 用于查地理位置
                query_ip = host
                try:
                    socket.gethostbyname(host) # 简单验证
                except:
                    continue 

                node_data = {
                    "name": name,
                    "host": host,
                    "port": port,
                    "latency": latency,
                    "link": original_link,
                    "query_ip": query_ip # 用于后续批量查询地理位置
                }
                valid_nodes.append(node_data)
                ips_to_query.append(query_ip)
            else:
                print(f"[FAIL] {name}")
    
    # 批量获取节点地理位置 (IP-API batch 限制每分钟 15 次请求，每次 100 个 IP)
    # 简单起见，这里假设节点数不巨量，分批处理
    geo_results = {}
    if ips_to_query:
        # 去重
        unique_ips = list(set(ips_to_query))
        # 分块，每块 100 个
        for i in range(0, len(unique_ips), 100):
            batch = unique_ips[i:i+100]
            try:
                resp = requests.post(GEO_API_URL, json=batch, timeout=10)
                for item in resp.json():
                    if 'query' in item:
                        geo_results[item['query']] = item
            except Exception as e:
                print(f"GeoAPI Error: {e}")
            time.sleep(2) # 礼貌等待

    # 整合数据
    final_list = []
    for node in valid_nodes:
        geo = geo_results.get(node['host'], {}) # 如果 host 是域名可能匹配不到，这里简化处理
        if not geo: 
            # 尝试解析域名后的 IP 匹配
            try:
                real_ip = socket.gethostbyname(node['host'])
                geo = geo_results.get(real_ip, {})
            except:
                pass
        
        node['country'] = geo.get('country', 'Unknown')
        node['city'] = geo.get('city', 'Unknown')
        node['isp'] = geo.get('isp', 'Unknown')
        final_list.append(node)

    # 排序：先按国家排序，再按延迟排序
    final_list.sort(key=lambda x: (x['country'], x['latency']))

    output_data = {
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "runner_ip": runner_info,
        "nodes": final_list
    }

    with open("nodes.json", "w", encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print("Done. Data saved to nodes.json")

if __name__ == "__main__":
=======
import os
import re
import json
import base64
import socket
import requests
import time
from urllib.parse import urlparse

# 配置
# 在 GitHub Secrets 中设置 SUBSCRIBE_URL，或者直接在这里填入（不推荐公开）
SUBSCRIBE_URL = os.environ.get("SUBSCRIBE_URL", "你的订阅链接放在这里")
GEO_API_URL = "http://ip-api.com/batch" # 使用批量查询接口
TIMEOUT = 3 # 测速超时时间（秒）

def get_runner_info():
    """获取当前 GitHub Runner 的真实 IP"""
    try:
        r = requests.get("http://ip-api.com/json/", timeout=5)
        return r.json()
    except:
        return {"query": "Unknown", "country": "Unknown", "city": "Unknown"}

def decode_subscription(url):
    """下载并解码 Base64 订阅"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        content = requests.get(url, headers=headers).text
        # 补全 padding
        padded = content + "=" * ((4 - len(content) % 4) % 4)
        decoded_bytes = base64.urlsafe_b64decode(padded)
        decoded_str = decoded_bytes.decode('utf-8')
        return decoded_str.splitlines()
    except Exception as e:
        print(f"Error decoding subscription: {e}")
        return []

def parse_node(link):
    """简单的节点解析 (仅支持 vmess/ss/trojan 的基本提取用于测速)"""
    # 这里为了演示，主要提取 IP 和端口进行 TCP 握手
    # 实际生产环境建议使用专门的库解析完整协议
    host = None
    port = None
    name = "Unknown Node"
    
    try:
        if link.startswith("vmess://"):
            # vmess 是 base64 编码的 json
            b64 = link[8:]
            padded = b64 + "=" * ((4 - len(b64) % 4) % 4)
            info = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
            host = info.get('add')
            port = info.get('port')
            name = info.get('ps', 'Vmess Node')
        elif link.startswith("ss://"):
            # ss 解析逻辑简化
            if '@' in link:
                part = link.split('@')[1]
                host_port = part.split('#')[0].split(':')
                host = host_port[0]
                port = host_port[1]
                name = requests.utils.unquote(link.split('#')[1]) if '#' in link else "SS Node"
    except:
        pass
        
    return host, port, name, link

def tcp_latency(host, port):
    """TCP 握手测速"""
    if not host or not port:
        return -1
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(TIMEOUT)
    start = time.time()
    try:
        s.connect((host, int(port)))
        s.close()
        return int((time.time() - start) * 1000)
    except:
        return -1

def main():
    print("Starting process...")
    runner_info = get_runner_info()
    print(f"Runner IP: {runner_info['query']} ({runner_info['country']})")

    links = decode_subscription(SUBSCRIBE_URL)
    valid_nodes = []
    ips_to_query = []

    print(f"Found {len(links)} nodes provided. Testing connectivity...")

    for link in links:
        host, port, name, original_link = parse_node(link)
        if host and port:
            latency = tcp_latency(host, port)
            if latency != -1:
                # 只有通的节点才加入列表
                print(f"[OK] {latency}ms - {name}")
                
                # 判断 host 是域名还是 IP，如果是域名需解析为 IP 用于查地理位置
                query_ip = host
                try:
                    socket.gethostbyname(host) # 简单验证
                except:
                    continue 

                node_data = {
                    "name": name,
                    "host": host,
                    "port": port,
                    "latency": latency,
                    "link": original_link,
                    "query_ip": query_ip # 用于后续批量查询地理位置
                }
                valid_nodes.append(node_data)
                ips_to_query.append(query_ip)
            else:
                print(f"[FAIL] {name}")
    
    # 批量获取节点地理位置 (IP-API batch 限制每分钟 15 次请求，每次 100 个 IP)
    # 简单起见，这里假设节点数不巨量，分批处理
    geo_results = {}
    if ips_to_query:
        # 去重
        unique_ips = list(set(ips_to_query))
        # 分块，每块 100 个
        for i in range(0, len(unique_ips), 100):
            batch = unique_ips[i:i+100]
            try:
                resp = requests.post(GEO_API_URL, json=batch, timeout=10)
                for item in resp.json():
                    if 'query' in item:
                        geo_results[item['query']] = item
            except Exception as e:
                print(f"GeoAPI Error: {e}")
            time.sleep(2) # 礼貌等待

    # 整合数据
    final_list = []
    for node in valid_nodes:
        geo = geo_results.get(node['host'], {}) # 如果 host 是域名可能匹配不到，这里简化处理
        if not geo: 
            # 尝试解析域名后的 IP 匹配
            try:
                real_ip = socket.gethostbyname(node['host'])
                geo = geo_results.get(real_ip, {})
            except:
                pass
        
        node['country'] = geo.get('country', 'Unknown')
        node['city'] = geo.get('city', 'Unknown')
        node['isp'] = geo.get('isp', 'Unknown')
        final_list.append(node)

    # 排序：先按国家排序，再按延迟排序
    final_list.sort(key=lambda x: (x['country'], x['latency']))

    output_data = {
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "runner_ip": runner_info,
        "nodes": final_list
    }

    with open("nodes.json", "w", encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print("Done. Data saved to nodes.json")

if __name__ == "__main__":
>>>>>>> 5325c846ceae166d1671e39c58f0e827dd3b0d20
    main()