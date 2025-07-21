from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    """Create a new access token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the subject"""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = payload.get("sub")
        return token_data
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def decode_supabase_jwt(token: str) -> Optional[dict]:
    """Decode Supabase JWT token without verification for development"""
    try:
        # Note: In production, you should verify the token properly
        # This is a simplified version for development
        payload = jwt.decode(
            token,
            key="",  # Empty key since we're not verifying
            algorithms=["HS256"],  # Algorithm is required even when not verifying
            options={
                "verify_signature": False, 
                "verify_exp": False,
                "verify_aud": False,  # Disable audience verification
                "verify_iss": False   # Disable issuer verification
            }
        )
        logger.info(f"Successfully decoded JWT for user: {payload.get('sub', 'unknown')}")
        return payload
    except Exception as e:
        logger.error(f"Failed to decode Supabase JWT: {e}")
        return None