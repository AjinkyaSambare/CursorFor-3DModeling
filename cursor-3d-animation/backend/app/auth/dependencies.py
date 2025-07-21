from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.supabase import supabase
from app.core.security import decode_supabase_jwt
from app.auth.models import UserResponse
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserResponse]:
    """Get current user from JWT token, return None if not authenticated"""
    if not credentials:
        return None
    
    try:
        # Decode the Supabase JWT token
        payload = decode_supabase_jwt(credentials.credentials)
        if not payload:
            return None
            
        user_id = payload.get("sub")
        if not user_id:
            return None
            
        # Extract user info from JWT payload instead of calling Supabase
        # This avoids dependency on Supabase client initialization
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})
        
        if email:
            # Handle datetime parsing safely
            created_at = None
            email_confirmed_at = None
            
            try:
                from datetime import datetime
                if payload.get("created_at"):
                    created_at = datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00"))
                if payload.get("email_confirmed_at"):
                    email_confirmed_at = datetime.fromisoformat(payload["email_confirmed_at"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                # If datetime parsing fails, keep as None
                pass
            
            return UserResponse(
                id=user_id,
                email=email,
                display_name=user_metadata.get("display_name"),
                avatar_url=user_metadata.get("avatar_url"),
                created_at=created_at,
                email_confirmed_at=email_confirmed_at
            )
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserResponse:
    """Get current user from JWT token, raise exception if not authenticated"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await get_current_user_optional(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user)
) -> UserResponse:
    """Get current active user"""
    # Add any additional checks here (e.g., user is active, not banned, etc.)
    return current_user

def get_user_id_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """Extract user ID from token without full user validation"""
    if not credentials:
        return None
    
    try:
        payload = decode_supabase_jwt(credentials.credentials)
        return payload.get("sub") if payload else None
    except Exception:
        return None

async def require_user_id(
    user_id: Optional[str] = Depends(get_user_id_from_token)
) -> str:
    """Require user ID, raise exception if not found"""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id