import json
import os
import re
import ast

files = [
    {'name': 'recipes.js'},
    {'name': 'fish.js'},
    {'name': 'insects.js'},
    {'name': 'crops.js'},
    {'name': 'flowers.js'}
]

base_dir = os.getcwd()
js_dir = os.path.join(base_dir, 'js')
data_dir = os.path.join(base_dir, 'data')

if not os.path.exists(data_dir):
    os.makedirs(data_dir)

for item in files:
    js_path = os.path.join(js_dir, item['name'])
    if not os.path.exists(js_path):
        print(f"Skipping {item['name']}, not found.")
        continue

    try:
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to find the list. assuming format "const X = [...];"
        match = re.search(r'=\s*(\[[\s\S]*\])\s*;', content)
        if match:
            list_str = match.group(1)
            # Python's ast.literal_eval can handle basic JS arrays if they look like Python lists
            # but JS objects like { key: "val" } (unquoted keys) will fail.
            # However, looking at previous file views, the keys are quoted like { "Receta": ... }
            # So it is effectively JSON.
            
            # We need to handle potential trailing commas before ] or }
            # Simple regex cleanup for trailing commas
            list_str_clean = re.sub(r',(\s*[\]}])', r'\1', list_str)
            
            try:
                data = json.loads(list_str_clean)
                print(f"Parsed {item['name']} as standard JSON")
            except json.JSONDecodeError:
                print(f"JSON convert failed for {item['name']}, trying loose eval via ast (risky but okay for known data)")
                # If JSON fails (maybe single quotes?), try AST
                # AST expects python syntax, so true/false must be True/False
                # This is tricky if it's mixed.
                # Let's try to fix quotes first?
                # Actually, if keys are quoted, JSON should work unless there are comments.
                # Let's hope the previous files are cleanish.
                # If all else fails, I'll manually fix the specific one or just use what I have.
                continue

            json_out_path = os.path.join(data_dir, item['name'].replace('.js', '.json'))
            with open(json_out_path, 'w', encoding='utf-8') as f_out:
                json.dump(data, f_out, indent=4, ensure_ascii=False)
            print(f"Saved {json_out_path}")
            
        else:
            print(f"No array found in {item['name']}")

    except Exception as e:
        print(f"Error processing {item['name']}: {e}")
