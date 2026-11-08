import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

print("=" * 80)
print("DEEP CODEBASE SECURITY SCAN - VULNERABILITY & BACKDOOR HUNT")
print("=" * 80)

# Dangerous patterns to scan for
PATTERNS = [
    (r"eval\(", "Dangerous eval() call"),
    (r"exec\(", "Dangerous exec() call"),
    (r"__import__\(", "Dynamic import call"),
    (r"os\.system\(", "os.system shell execution"),
    (r"subprocess\.", "Subprocess execution"),
    (r"pickle\.loads\(", "Insecure deserialization (pickle)"),
    (r"yaml\.load\((?!.*SafeLoader)", "Unsafe PyYAML load"),
    (r"(?i)(password|secret|key|token)\s*=\s*['\"][a-zA-Z0-9_\-]{8,}['\"]", "Possible hardcoded secret"),
    (r"(?i)if.*(bypass|backdoor|master_pass|debug_mode|god_mode)", "Backdoor or bypass condition"),
    (r"(?i)SELECT.*FROM.*%.*;", "Unsafe string formatting in SQL"),
    (r"(?i)text\(['\"].*\{.*\}['\"]\)", "f-string inside SQLAlchemy text()"),
    (r"(?i)text\(f['\"]", "f-string inside SQLAlchemy text()"),
    (r"dangerouslySetInnerHTML", "React dangerouslySetInnerHTML"),
]

backend_dir = ROOT / "backend" / "app"
frontend_src = ROOT / "frontend" / "src"

findings = []

def scan_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines, start=1):
            for pat, desc in PATTERNS:
                if re.search(pat, line):
                    # Filter out benign or known safe occurrences
                    # e.g., SECRET_KEY default in config.py, test mocks, etc.
                    clean_line = line.strip()
                    findings.append({
                        "file": str(filepath.relative_to(ROOT)),
                        "line": idx,
                        "desc": desc,
                        "content": clean_line
                    })
    except Exception as e:
        pass

for p in backend_dir.rglob("*.py"):
    scan_file(p)

for p in frontend_src.rglob("*.jsx"):
    scan_file(p)
for p in frontend_src.rglob("*.js"):
    scan_file(p)

print(f"Total potential flags identified: {len(findings)}")
for f in findings:
    print(f"[{f['desc']}] {f['file']}:{f['line']}")
    print(f"    --> {f['content'][:120]}")
    print()

