#!/usr/bin/env python3
"""
Migration script to add user_id to existing scene metadata.
This fixes the video preview issue in the timeline editor.
"""

import json
import asyncio
from pathlib import Path
from typing import Dict, Any
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_scene_metadata():
    """Add user_id to existing scenes that don't have it"""
    
    # Get the storage directory
    base_dir = Path(__file__).parent
    scenes_dir = base_dir / "storage" / "scenes"
    
    if not scenes_dir.exists():
        logger.error(f"Scenes directory not found: {scenes_dir}")
        return
    
    # Get all scene files
    scene_files = list(scenes_dir.glob("*.json"))
    logger.info(f"Found {len(scene_files)} scene files to check")
    
    updated_count = 0
    skipped_count = 0
    
    # For this migration, we'll use a default user ID since we don't have
    # user tracking in the existing scenes. In a production environment,
    # you would need to map scenes to actual users.
    default_user_id = "migration-user"
    
    for scene_file in scene_files:
        try:
            # Read the scene data
            with open(scene_file, 'r') as f:
                scene_data = json.load(f)
            
            # Check if user_id already exists in metadata
            metadata = scene_data.get("metadata", {})
            
            if "user_id" in metadata:
                logger.debug(f"Scene {scene_data['id']} already has user_id, skipping")
                skipped_count += 1
                continue
            
            # Add user_id to metadata
            metadata["user_id"] = default_user_id
            scene_data["metadata"] = metadata
            
            # Write back to file
            with open(scene_file, 'w') as f:
                json.dump(scene_data, f, indent=2)
            
            logger.info(f"Updated scene {scene_data['id']} with user_id")
            updated_count += 1
            
        except Exception as e:
            logger.error(f"Failed to update scene file {scene_file}: {e}")
            continue
    
    logger.info(f"Migration complete: {updated_count} scenes updated, {skipped_count} scenes skipped")

async def verify_migration():
    """Verify that all scenes now have user_id in metadata"""
    
    base_dir = Path(__file__).parent
    scenes_dir = base_dir / "storage" / "scenes"
    scene_files = list(scenes_dir.glob("*.json"))
    
    missing_user_id = []
    
    for scene_file in scene_files:
        try:
            with open(scene_file, 'r') as f:
                scene_data = json.load(f)
            
            metadata = scene_data.get("metadata", {})
            if "user_id" not in metadata:
                missing_user_id.append(scene_data['id'])
                
        except Exception as e:
            logger.error(f"Failed to read scene file {scene_file}: {e}")
    
    if missing_user_id:
        logger.warning(f"Scenes still missing user_id: {missing_user_id}")
    else:
        logger.info("All scenes now have user_id in metadata")

if __name__ == "__main__":
    print("🔄 Starting scene metadata migration...")
    asyncio.run(migrate_scene_metadata())
    
    print("✅ Verifying migration...")
    asyncio.run(verify_migration())
    
    print("🎉 Migration complete!")