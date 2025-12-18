import sqlite3
import os

# Database is expected to be in the current directory (backend/)
db_path = "agento.db"

if not os.path.exists(db_path):
    print(f"Database {db_path} not found. Nothing to update.")
else:
    print(f"Connecting to {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column exists first to avoid error if re-run
        # SQLite doesn't have "IF NOT EXISTS" for ADD COLUMN in older versions, 
        # but we can just catch the specific error.
        try:
            cursor.execute("ALTER TABLE workflows ADD COLUMN is_public BOOLEAN DEFAULT 0")
            conn.commit()
            print("Successfully added 'is_public' column to 'workflows' table.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column 'is_public' already exists.")
            else:
                raise e
                
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("Connection closed.")
