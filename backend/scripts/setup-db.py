import os
import sys
from pathlib import Path

# Ensure root directory is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.database import engine, sync_database_schema, init_database

if __name__ == "__main__":
    print("------------------------------------------------------------")
    print("  Checking and Synchronizing Database Schema...")
    print("------------------------------------------------------------")
    
    changes = sync_database_schema(engine)
    if changes:
        print(f"  [+] Applied {len(changes)} schema update(s):")
        for change in changes:
            print(f"      * {change}")
        print("  [+] All existing records and tables preserved.")
    else:
        print("  [*] Database schema is already up to date.")
        print("  [*] No tables recreated; all existing data preserved.")
    
    print("  [*] Verifying baseline seeds and permissions...")
    init_database()
    print("------------------------------------------------------------")
    print("  Database check & setup completed successfully!")
    print("------------------------------------------------------------")
