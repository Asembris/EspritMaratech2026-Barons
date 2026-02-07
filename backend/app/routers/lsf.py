from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from app.services.lsf_service import get_lsf_service, LSFService

router = APIRouter(prefix="/api/lsf", tags=["LSF Translation"])

class LSFConvertRequest(BaseModel):
    text: str
    user_id: Optional[int] = None

class LSFConvertResponse(BaseModel):
    video_url: Optional[str] = None
    glosses: List[str] = []
    error: Optional[str] = None

@router.post("/convert", response_model=LSFConvertResponse)
async def convert_text_to_lsf(
    request: LSFConvertRequest, 
    service: LSFService = Depends(get_lsf_service)
):
    """
    Convert text to LSF video.
    Returns a URL to the generated video and the list of glosses used.
    """
    try:
        result = await service.translate_text(request.text)
        
        if result.get("error"):
            return LSFConvertResponse(error=result["error"])
            
        # Construct video URL
        # We need to serve the temp file. 
        # For simplicity, we'll serve it via a GET endpoint using the filename
        video_path = result["video_path"]
        filename = os.path.basename(video_path)
        video_url = f"/api/lsf/video/{filename}"
        
        return LSFConvertResponse(
            video_url=video_url,
            glosses=result["glosses"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/video/{filename}")
async def get_lsf_video(filename: str, background_tasks: BackgroundTasks):
    """
    Stream the generated LSF video.
    """
    # Security check: only allow files from temp_videos directory
    # resolving path relative to project root
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "utils", "temp_videos")
    # Actually VideoProcessor uses app/utils/temp_videos? 
    # Let's check VideoProcessor implementation:
    # self.temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), temp_dir)
    # if app/utils/video_processor.py is the file, then dirname is app/utils, dirname(dirname) is app/
    # so temp_dir is app/temp_videos
    
    # Wait, in VideoProcessor I used:
    # os.path.join(os.path.dirname(os.path.dirname(__file__)), temp_dir)
    # file is backend/app/utils/video_processor.py
    # dirname -> backend/app/utils
    # dirname(dirname) -> backend/app
    # + temp_videos -> backend/app/temp_videos
    
    file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp_videos", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    return FileResponse(file_path, media_type="video/mp4")

@router.get("/available-signs")
async def get_available_signs(service: LSFService = Depends(get_lsf_service)):
    """Return list of available LSF signs for autocomplete."""
    return {"signs": service.get_all_glosses()}
