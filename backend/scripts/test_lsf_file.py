import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.lsf_service import get_lsf_service

async def test_lsf_translation():
    try:
        service = get_lsf_service()
        
        test_phrases = [
            "hello how are you where do you feel pain ?",
            "salut caaa va" # Typo test for fuzzy matching
        ]
        
        with open("lsf_test_result.txt", "w", encoding="utf-8") as f:
            f.write("=== Testing LSF Translation Service ===\n\n")
            
            for text in test_phrases:
                f.write(f"Input: '{text}'\n")
                try:
                    result = await service.translate_text(text)
                    
                    if result.get("error"):
                        f.write(f"Error: {result['error']}\n")
                        f.write(f"Details: {result.get('details')}\n")
                    else:
                        f.write(f"Gloss Mapping: {result['glosses']}\n")
                        f.write(f"Generated Video: {result['video_path']}\n")
                        f.write(f"Metadata matches: {result['metadata']['matches']}\n")
                        
                except Exception as e:
                    f.write(f"Exception: {e}\n")
                    import traceback
                    f.write(traceback.format_exc())
                    
                f.write("-" * 50 + "\n")
                
        print("Test complete. Check lsf_test_result.txt")
    except Exception as e:
        print(f"Global Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_lsf_translation())
