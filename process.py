import os
import re
import json
import base64
import socket
import requests
import time
import concurrent.futures
from urllib.parse import urlparse, unquote

# 配置
TIMEOUT = 3  # 测速超时
MAX_WORKERS = 20  # 并发数
GEO_API_URL = "http://ip-api.com/batch"

class NodeProcessor:
    def __init__(self):
        self.nodes = []
        self.runner_info = {}

    def get_runner_info(self):
        """获取 GitHub Runner 节点信息"""
        try:
            r = requests.get("http://ip-api.com/json/", timeout=5)
            self.runner_info = r.json()
        except:
            self.runner_info = {"query": "Unknown", "country": "Unknown"}

    def decode_base64(self, data):
        """兼容各种长度的 Base64 解码"""
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
        try:
            return base64.b64decode(data).decode('utf-8')
        except:
            return ""

    def parse_subscription(self, content):
        """解析订阅内容，识别各种协议头"""
        decoded = self.decode_base64(content)
        lines = decoded.splitlines()
        extracted = []
        for line in lines:
            if not line: continue
            # 简单的正则提取主机和端口，此处可根据需要扩展各协议详细解析
            try:
                # 识别主流协议
                protocol = line.split('://')[0] if '://' in line else 'unknown'
                # 尝试提取名称
                name = unquote(line.split('#')[-1]) if '#' in line else "未命名节点"
                
                # 提取地址 (简单逻辑：提取域名或IP)
                host_part = line.split('@')[-1].split('#')[0] if '@' in line else line.split('://')[-1].split('#')[0]
                address = host_part.split(':')[0]
                port = host_part.split(':')[1].split('?')[0] if ':' in host_part else "443"

                extracted.append({
                    "name": name,
                    "address": address,
                    "port": int(port),
                    "protocol": protocol,
                    "raw": line
                })
            except:
                continue
        return extracted

    def test_latency(self, node):
        """TCP 握手测速"""
        start_time = time.time()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(TIMEOUT)
            sock.connect((node['address'], node['port']))
            sock.close()
            node['latency'] = int((time.time() - start_time) * 1000)
            return node
        except:
            return None

    def process(self, sub_url):
        print(f"[*] 正在获取订阅: {sub_url[:20]}...")
        self.get_runner_info()
        
        try:
            resp = requests.get(sub_url, timeout=10)
            raw_nodes = self.parse_subscription(resp.text)
        except Exception as e:
            print(f"[!] 获取失败: {e}")
            return

        print(f"[*] 发现 {len(raw_nodes)} 个节点，开始并发测速...")
        
        # 并发测速
        valid_nodes = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(self.test_latency, n) for n in raw_nodes]
            for future in concurrent.futures.as_completed(futures):
                res = future.result()
                if res: valid_nodes.append(res)

        # 批量获取地理位置
        ips = list(set([n['address'] for n in valid_nodes if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", n['address'])]))
        geo_data = {}
        for i in range(0, len(ips), 100):
            batch = ips[i:i+100]
            try:
                r = requests.post(GEO_API_URL, json=batch, timeout=10)
                for item in r.json():
                    geo_data[item['query']] = item
            except: pass
            time.sleep(1)

        # 整合
        for n in valid_nodes:
            info = geo_data.get(n['address'], {})
            n['country'] = info.get('country', 'Unknown')
            n['city'] = info.get('city', 'Unknown')
            n['isp'] = info.get('isp', 'Unknown')
            n['flag'] = info.get('countryCode', '')

        # 排序
        valid_nodes.sort(key=lambda x: (x['country'], x['latency']))
        
        output = {
            "server_info": {
                "ip": self.runner_info.get("query"),
                "location": f"{self.runner_info.get('country')} / {self.runner_info.get('city')}",
                "isp": self.runner_info.get("isp"),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            "nodes": valid_nodes
        }

        with open("nodes.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print("[+] 处理完成，数据已写入 nodes.json")

if __name__ == "__main__":
    sub = os.environ.get("SUBSCRIBE_URL")
    if sub:
        NodeProcessor().process(sub)
    else:
        print("[!] 未发现 SUBSCRIBE_URL 环境变量")