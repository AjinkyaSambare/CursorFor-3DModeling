#\!/usr/bin/env python3
"""
Migration script to add user_id to existing projects.

This script will:
1. Find all existing project files without user_id
2. Either assign them to a default user or mark them as orphaned
3. Update the project files with the user_id field

Usage: python migrate_existing_projects.py [--default-user-id USER_ID]
"""

import json
import argparse
from pathlib import Path
from app.core.config import settings

def migrate_projects(default_user_id=None):
    """Migrate existing projects to include user_id field"""
    projects_dir = settings.STORAGE_DIR / "projects"
    
    if not projects_dir.exists():
        print("No projects directory found. Nothing to migrate.")
        return
    
    project_files = list(projects_dir.glob("*.json"))
    
    if not project_files:
        print("No project files found. Nothing to migrate.")
        return
    
    print(f"Found {len(project_files)} project files to check...")
    
    migrated_count = 0
    
    for project_file in project_files:
        try:
            # Read existing project
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Check if user_id already exists
            if 'user_id' in project_data:
                print(f"✓ {project_file.name} already has user_id")
                continue
            
            # Add user_id field
            if default_user_id:
                project_data['user_id'] = default_user_id
                print(f"📝 Adding user_id '{default_user_id}' to {project_file.name}")
            else:
                # Mark as orphaned - you can manually assign later
                project_data['user_id'] = "ORPHANED_PROJECT"
                print(f"⚠️  Marking {project_file.name} as orphaned (no default user provided)")
            
            # Write back to file
            with open(project_file, 'w') as f:
                json.dump(project_data, f, indent=2)
            
            migrated_count += 1
            
        except Exception as e:
            print(f"❌ Error processing {project_file.name}: {e}")
    
    print(f"\n✅ Migration complete\! Updated {migrated_count} project(s)")
    
    if default_user_id is None:
        print("\n💡 Note: Projects were marked as 'ORPHANED_PROJECT'.")
        print("   You can manually update them with actual user IDs later.")
        print("   Or re-run this script with --default-user-id option.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate existing projects to include user_id")
    parser.add_argument(
        "--default-user-id", 
        help="Default user ID to assign to existing projects without user_id"
    )
    
    args = parser.parse_args()
    
    print("🔄 Starting project migration...")
    migrate_projects(args.default_user_id)
EOF < /dev/null