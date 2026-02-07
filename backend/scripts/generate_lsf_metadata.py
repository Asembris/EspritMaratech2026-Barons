import os
import json
import ffmpeg
import argparse
import unicodedata
import re
from pathlib import Path
from typing import Dict, List, Any

# ===========================
# Configuration
# ===========================
DEFAULT_VIDEO_DIR = r"D:\EspritMaratech2026-Barons-omar\DICTIONNAIRE MÉDICAL EN LANGUE DES SIGNES TUNISIENNE _AVST_"
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "data", "lsf_metadata.json")

# Ensure output directory exists
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

def normalize_text(text: str) -> str:
    """Normalize text: lowercase, remove accents (e.g. é->e), remove punctuation."""
    # Remove file extension first
    if text.lower().endswith(".mp4"):
        text = text[:-4]
        
    # Lowercase
    text = text.lower()
    
    # Normalize unicode (NFD decomposes characters: é -> e + accent mark)
    text = unicodedata.normalize('NFD', text)
    # Filter out non-spacing mark characters (accents)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    
    # Replace separators with space
    text = text.replace("_", " ").replace("-", " ")
    
    # Remove non-alphanumeric (except spaces)
    text = re.sub(r'[^a-z0-9\s]', '', text)
    
    # Collapse multiple spaces
    return " ".join(text.split())

def get_video_duration(file_path: str) -> float:
    """Get video duration using ffmpeg-python."""
    try:
        probe = ffmpeg.probe(file_path)
        video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        return float(video_info['duration'])
    except Exception as e:
        print(f"Error probing {file_path}: {e}")
        return 0.0

def scan_directory(root_dir: str) -> Dict[str, Any]:
    """Recursively scan directory for MP4 files and build metadata."""
    index = {
        "metadata": {
            "root_dir": root_dir,
            "total_videos": 0,
            "categories": []
        },
        "videos": {}
    }
    
    root_path = Path(root_dir)
    if not root_path.exists():
        print(f"Error: Directory not found: {root_dir}")
        return index

    print(f"Scanning {root_dir}...")
    
    count = 0
    categories = set()

    for file_path in root_path.rglob("*.mp4"):
        try:
            # Extract relative path components
            rel_path = file_path.relative_to(root_path)
            category = rel_path.parent.name if rel_path.parent != Path(".") else "Uncategorized"
            filename = file_path.name
            gloss = normalize_text(filename)
            
            # Get duration
            duration = get_video_duration(str(file_path))
            
            # Build entry
            entry = {
                "gloss": gloss,
                "file_name": filename,
                "rel_path": str(rel_path),
                "full_path": str(file_path),
                "category": category,
                "duration": duration
            }
            
            # Add to index
            index["videos"][filename] = entry
            
            categories.add(category)
            count += 1
            
            if count % 10 == 0:
                print(f"Processed {count} videos...", end="\r")
                
        except Exception as e:
            print(f"Skipping {file_path}: {e}")

    index["metadata"]["total_videos"] = count
    index["metadata"]["categories"] = list(categories)
    
    print(f"\nScan complete. Found {count} videos in {len(categories)} categories.")
    return index

def main():
    parser = argparse.ArgumentParser(description="Generate LSF Metadata Index")
    parser.add_argument("--dir", default=DEFAULT_VIDEO_DIR, help="Root directory of LSF videos")
    parser.add_argument("--output", default=OUTPUT_FILE, help="Output JSON file path")
    
    args = parser.parse_args()
    
    data = scan_directory(args.dir)
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Metadata saved to {args.output}")

if __name__ == "__main__":
    main()
