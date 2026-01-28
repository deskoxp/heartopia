import json
import re

input_file = 'data.json'
output_file = 'data.json'

def parse_line(line):
    # Split by tab
    parts = line.strip().split('\t')
    # Remove leading + if present (first line had +=)
    # Remove =" and ending "
    cleaned = []
    for p in parts:
        # Regex to extract content between =" and "
        # Typical format: ="Some Text"
        # Sometimes: +="Some Text"
        match = re.search(r'="([^"]*)"', p)
        if match:
            cleaned.append(match.group(1))
        else:
            cleaned.append(p)
    return cleaned

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    headers = parse_line(lines[0])
    data = []
    
    for line in lines[1:]:
        if not line.strip(): continue
        values = parse_line(line)
        
        # Create dict
        row = {}
        for i, h in enumerate(headers):
            val = values[i] if i < len(values) else ""
            row[h] = val
        data.append(row)
        
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print("Conversion successful. First item:")
    print(data[0])

except Exception as e:
    print(f"Error: {e}")
