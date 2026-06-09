import json
import os
from supabase import create_client, Client

# 1. 配置您的 Supabase 信息
url: str = "https://iwpzcmmwtnvcphatrucd.supabase.co"
key: str = "您的_SUPABASE_SERVICE_ROLE_KEY_（不要用public key，用service_role key拥有写入权限）"

print("----------------------------------------")
print("Supabase 数据迁移工具")
print("----------------------------------------")

if key == "您的_SUPABASE_SERVICE_ROLE_KEY_（不要用public key，用service_role key拥有写入权限）":
    print("❌ 错误：您还没有配置 service_role key！")
    print("请用记事本打开这个脚本，把 key 替换成您真实的密钥。")
    input("\n按回车键退出...")
    exit()

supabase: Client = create_client(url, key)

# 2. 读取从 Firebase 导出的 JSON 文件
file_name = 'firebase_export.json'
if not os.path.exists(file_name):
    print(f"❌ 错误：找不到文件 '{file_name}'！")
    print("请确保您已经把 Firebase 导出的数据放到了这个目录下，并重命名为 firebase_export.json。")
    input("\n按回车键退出...")
    exit()

try:
    with open(file_name, 'r', encoding='utf-8') as f:
        firebase_data = json.load(f)
except Exception as e:
    print(f"❌ 错误：读取 JSON 文件失败: {e}")
    input("\n按回车键退出...")
    exit()

# 3. 迁移进度数据 (progress)
has_data = False
if 'progress' in firebase_data:
    has_data = True
    print("\n开始迁移 progress 数据...")
    progress_data = firebase_data['progress']
    for uid, data in progress_data.items():
        try:
            # Upsert 数据：如果 uid 存在则更新，不存在则插入
            response = supabase.table('progress').upsert({"uid": uid, "data": data}).execute()
            print(f"✅ 成功迁移 progress: UID {uid}")
        except Exception as e:
            print(f"❌ 迁移 progress 失败 UID {uid}: {e}")

# 4. 迁移统计数据 (daily_stats)
if 'daily_stats' in firebase_data:
    has_data = True
    print("\n开始迁移 daily_stats 数据...")
    stats_data = firebase_data['daily_stats']
    for uid, data in stats_data.items():
        try:
            response = supabase.table('daily_stats').upsert({"uid": uid, "data": data}).execute()
            print(f"✅ 成功迁移 daily_stats: UID {uid}")
        except Exception as e:
            print(f"❌ 迁移 daily_stats 失败 UID {uid}: {e}")

if has_data:
    print("\n🎉 全部迁移尝试已完成！请检查上方是否有报错信息。")
else:
    print("\n⚠️ 警告：在 JSON 文件中没有找到 'progress' 或 'daily_stats' 节点。")
    print("请检查您的 Firebase 导出文件格式是否正确。")

input("\n按回车键退出...")
