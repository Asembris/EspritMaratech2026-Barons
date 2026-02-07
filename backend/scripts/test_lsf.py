import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.lsf_service import get_lsf_service

async def test_lsf_translation():
    service = get_lsf_service()
    
    # Test cases based on medical dictionary context
    test_phrases = [
        "J'ai mal à la tête",
        "Il a de la fièvre et il tousse",
        "Je suis diabétique",
        "hello how are you where do you feel pain ?"
    ]
    
    print("=== Testing LSF Translation Service ===\n")
    
    for text in test_phrases:
        print(f"Input: '{text}'")
        try:
            result = await service.translate_text(text)
            
            if result.get("error"):
                print(f"Error: {result['error']}")
            else:
                print(f"Gloss Mapping: {result['glosses']}")
                print(f"Generated Video: {result['video_path']}")
                print(f"Metadata: {result['metadata']}")
                
        except Exception as e:
            print(f"Exception: {e}")
            
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_lsf_translation())
