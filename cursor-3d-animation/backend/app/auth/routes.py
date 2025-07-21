from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from app.auth.models import (
    UserLogin, UserRegister, AuthResponse, UserResponse, 
    UserProfile, UserProfileUpdate, PasswordResetRequest, 
    PasswordReset, EmailVerification
)
from app.auth.dependencies import get_current_user, get_current_active_user
from app.core.supabase import get_supabase_anon_client, get_supabase_client
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    try:
        # Register user with Supabase
        supabase_anon = get_supabase_anon_client()
        response = supabase_anon.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "display_name": user_data.display_name or user_data.email.split("@")[0]
                }
            }
        })
        
        if response.user:
            # Create user profile in database
            profile_data = {
                "id": response.user.id,
                "display_name": user_data.display_name or user_data.email.split("@")[0],
                "preferences": {}
            }
            
            supabase = get_supabase_client()
            supabase.table("profiles").insert(profile_data).execute()
            
            user_response = UserResponse(
                id=response.user.id,
                email=response.user.email,
                display_name=user_data.display_name,
                created_at=response.user.created_at
            )
            
            return AuthResponse(
                success=True,
                message="User registered successfully. Please check your email for verification.",
                user=user_response,
                access_token=response.session.access_token if response.session else None
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=AuthResponse)
async def login(user_credentials: UserLogin):
    """Login user"""
    try:
        supabase_anon = get_supabase_anon_client()
        response = supabase_anon.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password
        })
        
        if response.user and response.session:
            user_response = UserResponse(
                id=response.user.id,
                email=response.user.email,
                display_name=response.user.user_metadata.get("display_name"),
                avatar_url=response.user.user_metadata.get("avatar_url"),
                created_at=response.user.created_at,
                email_confirmed_at=response.user.email_confirmed_at
            )
            
            return AuthResponse(
                success=True,
                message="Login successful",
                user=user_response,
                access_token=response.session.access_token
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout user"""
    try:
        supabase_anon = get_supabase_anon_client()
        supabase_anon.auth.sign_out()
        return {"message": "Logout successful"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logout completed"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user

@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: UserResponse = Depends(get_current_active_user)):
    """Get detailed user profile"""
    try:
        supabase = get_supabase_client()
        response = supabase.table("profiles").select("*").eq("id", current_user.id).execute()
        
        if response.data:
            profile_data = response.data[0]
            return UserProfile(**profile_data)
        else:
            # Create profile if it doesn't exist
            profile_data = {
                "id": current_user.id,
                "display_name": current_user.display_name,
                "preferences": {}
            }
            
            supabase.table("profiles").insert(profile_data).execute()
            return UserProfile(**profile_data)
            
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Update user profile"""
    try:
        update_data = profile_update.dict(exclude_unset=True)
        update_data["updated_at"] = "now()"
        
        supabase = get_supabase_client()
        response = supabase.table("profiles").update(update_data).eq("id", current_user.id).execute()
        
        if response.data:
            return UserProfile(**response.data[0])
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
            
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/password-reset")
async def request_password_reset(reset_request: PasswordResetRequest):
    """Request password reset"""
    try:
        supabase_anon = get_supabase_anon_client()
        supabase_anon.auth.reset_password_email(reset_request.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Upload user avatar"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        # Upload to Supabase Storage
        file_path = f"avatars/{current_user.id}/{file.filename}"
        
        # Upload file to Supabase storage
        supabase = get_supabase_client()
        upload_response = supabase.storage.from_("avatars").upload(
            file_path, 
            file_content,
            file_options={"content-type": file.content_type}
        )
        
        if upload_response.data:
            # Get public URL
            public_url = supabase.storage.from_("avatars").get_public_url(file_path)
            avatar_url = public_url.data["publicUrl"] if public_url.data else None
            
            # Update profile with new avatar URL
            update_response = supabase.table("profiles").update({
                "avatar_url": avatar_url,
                "updated_at": "now()"
            }).eq("id", current_user.id).execute()
            
            if update_response.data:
                return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update profile with avatar URL"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload avatar"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )

@router.delete("/profile")
async def delete_profile(current_user: UserResponse = Depends(get_current_active_user)):
    """Delete user profile and account"""
    try:
        # Delete user's profile data
        supabase = get_supabase_client()
        supabase.table("profiles").delete().eq("id", current_user.id).execute()
        
        # Delete user's scenes
        supabase.table("scenes").delete().eq("user_id", current_user.id).execute()
        
        # Delete user's projects
        supabase.table("projects").delete().eq("user_id", current_user.id).execute()
        
        # Note: Supabase auth user deletion should be handled carefully
        # In production, you might want to mark as deleted rather than actually delete
        
        return {"message": "Profile and associated data deleted successfully"}
        
    except Exception as e:
        logger.error(f"Profile deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile"
        )

@router.post("/verify-email")
async def verify_email(verification: EmailVerification):
    """Verify email address"""
    try:
        supabase_anon = get_supabase_anon_client()
        response = supabase_anon.auth.verify_otp({
            "token": verification.token,
            "type": "email"
        })
        
        if response.user:
            return {"message": "Email verified successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
            
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification failed"
        )