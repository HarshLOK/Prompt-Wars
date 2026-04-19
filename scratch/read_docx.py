import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(filename):
    try:
        with zipfile.ZipFile(filename) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.XML(xml_content)
            namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = []
            for paragraph in tree.iterfind('.//w:p', namespace):
                texts = [node.text for node in paragraph.iterfind('.//w:t', namespace) if node.text]
                if texts:
                    text.append(''.join(texts))
            return '\n'.join(text)
    except Exception as e:
        return f"Error reading {filename}: {e}"

with open("scratch/output.txt", "w", encoding="utf-8") as f:
    f.write("=== PRD ===\n")
    f.write(read_docx('SVES_PRD_v1.0.docx') + "\n")
    f.write("=== Design ===\n")
    f.write(read_docx('SVES_Design_Language_Doc.docx') + "\n")
    f.write("=== Tech Stack ===\n")
    f.write(read_docx('Tech Stack Recommendation Prompt.docx') + "\n")
