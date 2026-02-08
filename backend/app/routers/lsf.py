from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import uuid
import urllib.parse
from app.services.lsf_service import get_lsf_service, LSFService

router = APIRouter(prefix="/api/lsf", tags=["LSF Translation"])

# Simple in-memory cache for video paths (video_id -> full_path)
# In production, use Redis or similar
_video_cache: Dict[str, str] = {}

class LSFConvertRequest(BaseModel):
    text: str
    user_id: Optional[int] = None

class LSFConvertResponse(BaseModel):
    video_url: Optional[str] = None
    glosses: List[str] = []
    error: Optional[str] = None
    fallback_mode: bool = False

@router.post("/convert", response_model=LSFConvertResponse)
async def convert_text_to_lsf(
    request: LSFConvertRequest, 
    service: LSFService = Depends(get_lsf_service)
):
    """
    Convert text to LSF video.
    Returns a URL to the generated video and the list of glosses used.
    If video generation fails, returns fallback_mode=True and the glosses.
    """
    try:
        result = await service.translate_text(request.text)
        
        response = LSFConvertResponse(
            glosses=result.get("glosses", []),
            error=result.get("error"),
            fallback_mode=result.get("fallback_mode", False)
        )

        if result.get("video_path"):
            video_path = result["video_path"]
            # Generate a unique ID for this video
            video_id = str(uuid.uuid4())
            _video_cache[video_id] = video_path
            response.video_url = f"/api/lsf/video/{video_id}"
            
        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/video/{video_id}")
async def get_lsf_video(video_id: str):
    """
    Stream the generated LSF video by ID.
    """
    # Look up the video path from cache
    video_path = _video_cache.get(video_id)
    
    if not video_path:
        raise HTTPException(status_code=404, detail="Video not found or expired")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video file not found at path")
    
    return FileResponse(video_path, media_type="video/mp4")

@router.get("/available-signs")
async def get_available_signs(service: LSFService = Depends(get_lsf_service)):
    """Return list of available LSF signs for autocomplete."""
    return {"signs": service.get_all_glosses()}

