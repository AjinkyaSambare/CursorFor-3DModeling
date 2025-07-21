#!/usr/bin/env python3
"""
Database Setup Script for AI-Powered Educational Animation Platform

This script sets up the Supabase database with the required schema,
Row Level Security policies, and initial data.

Usage:
    python setup_database.py

Make sure to set up your .env file with Supabase credentials before running.
"""

import os
import sys
from pathlib import Path
from app.core.config import settings
from app.core.supabase import get_supabase_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def read_sql_file(file_path: Path) -> str:
    """Read SQL file content"""
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"SQL file not found: {file_path}")
        return None

def execute_sql_script(supabase, sql_content: str) -> bool:
    """Execute SQL script using Supabase client"""
    try:
        # Split the SQL content into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            if statement:
                logger.info(f"Executing statement {i+1}/{len(statements)}")
                try:
                    # Use raw SQL execution
                    result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                    logger.debug(f"Statement executed successfully: {statement[:100]}...")
                except Exception as e:
                    logger.warning(f"Statement {i+1} failed (this might be expected): {e}")
                    # Continue with other statements
        
        logger.info("Database schema setup completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to execute SQL script: {e}")
        return False

def verify_database_setup(supabase) -> bool:
    """Verify that the database was set up correctly"""
    try:
        # Check if required tables exist
        required_tables = ['profiles', 'projects', 'scenes', 'export_jobs', 'project_shares', 'user_settings']
        
        for table in required_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                logger.info(f"✓ Table '{table}' exists and is accessible")
            except Exception as e:
                logger.error(f"✗ Table '{table}' check failed: {e}")
                return False
        
        logger.info("Database verification completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Database verification failed: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("Starting database setup...")
    
    # Check if environment variables are set
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("Supabase credentials not found in environment variables")
        logger.error("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file")
        sys.exit(1)
    
    # Get Supabase client
    try:
        supabase = get_supabase_client()
        logger.info("Connected to Supabase successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # Read SQL schema file
    schema_file = Path(__file__).parent / "database_schema.sql"
    sql_content = read_sql_file(schema_file)
    
    if not sql_content:
        logger.error("Failed to read database schema file")
        sys.exit(1)
    
    # Execute schema
    logger.info("Executing database schema...")
    if not execute_sql_script(supabase, sql_content):
        logger.error("Failed to set up database schema")
        sys.exit(1)
    
    # Verify setup
    logger.info("Verifying database setup...")
    if not verify_database_setup(supabase):
        logger.error("Database verification failed")
        sys.exit(1)
    
    logger.info("✓ Database setup completed successfully!")
    logger.info("Your Supabase database is now ready for the animation platform.")

if __name__ == "__main__":
    main()