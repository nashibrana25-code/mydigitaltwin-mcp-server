import os
from bs4 import BeautifulSoup

for i in range(1, 17):
    filename = f"slide{i}.html"
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            html = f.read()
        soup = BeautifulSoup(html, 'lxml')
        text = soup.get_text(separator='\n')
        # Clean up: split by lines, strip, filter out empty lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        cleaned_text = '\n'.join(lines)
        print(f"Slide {i}: {cleaned_text}")
    else:
        print(f"Slide {i}: File not found")