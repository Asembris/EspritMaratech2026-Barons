from fastapi import APIRouter, UploadFile, File, HTTPException, Form
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
async def transcribe_audio(
    file: UploadFile = File(...),
    mode: str = Form("general") # 'general' or 'command'
):
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

        # Check file size
        file_size = os.path.getsize(temp_filename)
        print(f"DEBUG: Uploaded file size: {file_size} bytes")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty audio file received")

        # Convert to MP3 using ffmpeg (system call) for robustness
        # This fixes specific browser encoding issues with WebM/Ogg
        mp3_filename = temp_filename + ".mp3"
        print(f"DEBUG: Converting {temp_filename} to {mp3_filename}")
        
        import subprocess
        try:
            # -y overwrites, -i input, -vn no video, -acodec libmp3lame (or default)
            subprocess.run([
                "ffmpeg", "-y", "-i", temp_filename, 
                "-vn", "-ar", "44100", "-ac", "2", "-b:a", "128k", 
                mp3_filename
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Use the converted file
            file_to_send = mp3_filename
        except Exception as e:
            print(f"WARNING: FFmpeg conversion failed. Using original file. Error: {e}")
            # Fallback to original if ffmpeg not installed/fails
            file_to_send = temp_filename

        # Transcribe
        with open(file_to_send, "rb") as audio_file:
            print(f"DEBUG: Sending {file_to_send} to OpenAI...")
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language="fr"
            )
            
            raw_text = transcription.text
            print(f"DEBUG: Transcription result: {raw_text}")
        
        # Cleanup MP3 if created
        if file_to_send != temp_filename and os.path.exists(file_to_send):
            os.remove(file_to_send)
            
        # Correction & Translation to French via GPT-4o-mini
        # UNIFIED SMART PROMPT (Handles both Commands & Chat)
        system_prompt = (
            "You are an expert interpreter for a Super App (Banking, Store, Sign Language). "
            "Input may be in French, Darija (Tunisian), or English. "
            "Task: Convert the input into CLEAR, STANDARD FRENCH. "
            "RULES: "
            "1. TRANSLATE: 'Adaf' -> 'Ajouter', 'Chbih' -> 'Qu'est-ce qu'il a', 'Win' -> 'Où est'. "
            "2. CONTEXT MAPPING: "
            "   - 'Salah', 'Sela' -> 'Panier' (Basket) "
            "   - 'Bonk', 'Bank' -> 'Banque' "
            "   - 'Hanout', 'Magasin' -> 'Magasin' "
            "   - 'Traduire' -> 'Traducteur' "
            "   - 'Harrissa', 'Thon' -> Store Products. "
            "3. PHONETIC CORRECTION: Fix 'Bonk' -> 'Banque', 'No' -> 'Non'. "
            "Output ONLY the corrected French text. No explanations."
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
        print(f"DEBUG: Correction: '{raw_text}' -> '{corrected_text}'")
        
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
