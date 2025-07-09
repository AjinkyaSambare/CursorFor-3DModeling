from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

router = APIRouter()

@router.get("/favicon.ico")
async def favicon():
    """Return empty favicon to avoid 404"""
    return Response(content="", media_type="image/x-icon")

@router.get("/.well-known/appspecific/com.chrome.devtools.json")
async def devtools_json():
    """Return empty devtools config to avoid 404"""
    return JSONResponse(content=[])