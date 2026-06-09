import json
from supabase import create_client, Client

# 1. 配置您的 Supabase 信息
url: str = "https://iwpzcmmwtnvcphatrucd.supabase.co"
key: str = "您的_SUPABASE_SERVICE_ROLE_KEY_（不要用public key，用service_role key拥有写入权限）"
supabase: Client = create_client(url, key)

# 2. 读取从 Firebase 导出的 JSON 文件
# 假设您从 Firebase 导出的文件名为 firebase_export.json
with open('firebase_export.json', 'r', encoding='utf-8') as f:
    firebase_data = json.load(f)

# 3. 迁移进度数据 (progress)
if 'progress' in firebase_data:
    print("开始迁移 progress 数据...")
    progress_data = firebase_data['progress']
    for uid, data in progress_data.items():
        try:
            # Upsert 数据：如果 uid 存在则更新，不存在则插入
            response = supabase.table('progress').upsert({"uid": uid, "data": data}).execute()
            print(f"成功迁移 progress: UID {uid}")
        except Exception as e:
            print(f"迁移 progress 失败 UID {uid}: {e}")

# 4. 迁移统计数据 (daily_stats) - 如果 Firebase 里有这个节点
if 'daily_stats' in firebase_data:
    print("\n开始迁移 daily_stats 数据...")
    stats_data = firebase_data['daily_stats']
    for uid, data in stats_data.items():
        try:
            response = supabase.table('daily_stats').upsert({"uid": uid, "data": data}).execute()
            print(f"成功迁移 daily_stats: UID {uid}")
        except Exception as e:
            print(f"迁移 daily_stats 失败 UID {uid}: {e}")

print("\n🎉 全部迁移完成！")
input("\n按回车键退出...")
