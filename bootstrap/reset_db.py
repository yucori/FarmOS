import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
load_dotenv(dotenv_path=backend_dir / ".env")

from app.core.database import engine
from sqlalchemy import text

async def drop_all():
    print("WARNING: This will delete ALL data in the database.")
    confirm = input("Are you sure? Type 'YES' to continue: ")
    if confirm != "YES":
        print("Aborted.")
        sys.exit(0)

    try:
        async with engine.begin() as conn:
            print("Dropping public schema cascade...")
            await conn.execute(text("DROP SCHEMA public CASCADE"))
            print("Recreating public schema...")
            await conn.execute(text("CREATE SCHEMA public"))
            print("Granting privileges on public schema...")
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        
        print("\nDatabase has been completely wiped!")
        print("You can now run 'bootstrap.cmd' to recreate tables and reseed data.")
    except Exception as e:
        print(f"Error dropping database: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(drop_all())
