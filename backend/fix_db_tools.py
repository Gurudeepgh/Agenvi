import sqlite3
import os

db_path = "agento.db"

if not os.path.exists(db_path):
    print(f"Database {db_path} not found. Nothing to update.")
else:
    print(f"Connecting to {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create tools table manually matching the model
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR,
            description TEXT,
            code TEXT,
            is_preset BOOLEAN,
            owner_id INTEGER,
            FOREIGN KEY(owner_id) REFERENCES users(id)
        );
        """
        cursor.execute(create_table_sql)
        
        # Create index on name
        try:
            cursor.execute("CREATE INDEX ix_tools_name ON tools (name)")
        except sqlite3.OperationalError:
            pass # Index implies already exists or error
            
        conn.commit()
        print("Successfully created 'tools' table.")
                
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("Connection closed.")
