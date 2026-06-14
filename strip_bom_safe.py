import os

def remove_bom(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, 'rb') as f:
        content = f.read()
    if content.startswith(b'\xef\xbb\xbf'):
        print(f"Removing BOM from {file_path}")
        with open(file_path, 'wb') as f:
            f.write(content[3:])
    else:
        print(f"No BOM found in {file_path}")

for f in os.listdir('.'):
    if f.endswith('.html') or f.endswith('.js') or f.endswith('.json'):
        remove_bom(f)
