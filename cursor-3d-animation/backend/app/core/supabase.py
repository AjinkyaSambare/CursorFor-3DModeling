from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """Create and return a Supabase client instance"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL and Service Role Key must be configured")
    
    try:
        supabase = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info("Supabase client initialized successfully")
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise

def get_supabase_anon_client() -> Client:
    """Create and return a Supabase client instance with anon key for user operations"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError("Supabase URL and Anon Key must be configured")
    
    try:
        supabase = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY
        )
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase anon client: {e}")
        raise

# Global clients
supabase: Client = None
supabase_anon: Client = None

def init_supabase():
    """Initialize Supabase clients"""
    global supabase, supabase_anon
    try:
        supabase = get_supabase_client()
        supabase_anon = get_supabase_anon_client()
        logger.info("Supabase clients initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        raise