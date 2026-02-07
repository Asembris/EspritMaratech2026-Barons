from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
import os
import shutil
import tempfile

router = APIRouter(
    prefix="/api",
    tags=["transcription"]
)

# Initialize OpenAI client
# Ensure OPENAI_API_KEY is in environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio file using OpenAI Whisper model.
    """
    temp_filename = None
    try:
        # Create a temporary file with the same extension as uploaded
        suffix = os.path.splitext(file.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_filename = temp_file.name

            # Transcribe (Auto-detect language)
            # Transcribe
            with open(temp_filename, "rb") as audio_file:
                # Transcribe (Auto-detect language)
                transcription = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    # language="fr"  # REMOVED: Allow auto-detection (e.g. Tunisian/Arabic)
                )
                
                raw_text = transcription.text
            
            # Correction & Translation to French via GPT-4o-mini
            system_prompt = (
                "You are an expert translator and interpreter. "
                "The user input may be in French, English, or Tunisian Dialect (Darija). "
                "Your task is to translate and correct the input into standard, clear French. "
                "Output ONLY the translated text. Do not add explanations."
            )
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": raw_text}
                ],
                temperature=0.3
            )
            
            corrected_text = completion.choices[0].message.content.strip()
            
            return {
                "text": corrected_text, 
                "original_text": raw_text, 
                "detected_language": "auto"
            }

    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    finally:
        # Clean up temp file
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
