import json
import os
import unicodedata
import re
import difflib
from typing import List, Dict, Optional, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.utils.video_processor import VideoProcessor
import asyncio

# Load metadata
METADATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "lsf_metadata.json")

def normalize_text(text: str) -> str:
    """Normalize text: lowercase, remove accents (e.g. é->e), remove punctuation."""
    if not text: return ""
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

class LSFService:
    def __init__(self):
        self.metadata = self._load_metadata()
        self.video_processor = VideoProcessor()
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, model_kwargs={"response_format": {"type": "json_object"}})
        
        # Build lookup maps
        self.gloss_map = {}
        self.filename_map = {}
        self.normalized_gloss_map = {} 
        
        if self.metadata and "videos" in self.metadata:
            for k, v in self.metadata["videos"].items():
                self.filename_map[k] = v
                self.gloss_map[v["gloss"]] = v
                
                # Robust normalized map
                norm_gloss = normalize_text(v["gloss"])
                self.normalized_gloss_map[norm_gloss] = v
                
                # Also map filename synonyms (e.g. "salut_ca_va.mp4")
                norm_filename = normalize_text(k)
                self.normalized_gloss_map[norm_filename] = v

        self.available_glosses = list(self.gloss_map.keys())

    def _load_metadata(self) -> Dict[str, Any]:
        if not os.path.exists(METADATA_PATH):
            print(f"Warning: LSF metadata not found at {METADATA_PATH}")
            return {"videos": {}}
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_video_path(self, filename: str) -> Optional[str]:
        """Resolve absolute path for a video filename."""
        video_data = self.filename_map.get(filename)
        if not video_data:
            return None
        return video_data["full_path"]

    async def translate_text(self, text: str) -> Dict[str, Any]:
        """
        Translates text to LSF video sequence.
        Returns a dict with 'video_path', 'glosses', and 'mappings'.
        Falls back to just glosses if video generation fails.
        
        Strategy:
        1. LOCAL MATCHING FIRST: Try to match words/phrases directly against our gloss database
        2. LLM FALLBACK: If local matching finds nothing, use LLM for semantic matching
        """
        valid_videos = []
        final_glosses = []
        
        # Normalize input
        norm_input = normalize_text(text)
        print(f"[LSF DEBUG] Normalized input: '{norm_input}'")
        
        # --- PHASE 1: LOCAL MATCHING ---
        # Try to match the entire phrase first (e.g., "salut ca va" as one gloss)
        if norm_input in self.normalized_gloss_map:
            entry = self.normalized_gloss_map[norm_input]
            if os.path.exists(entry["full_path"]):
                valid_videos.append(entry["full_path"])
                final_glosses.append(entry["gloss"])
                print(f"[LSF DEBUG] ✅ Full phrase match: '{norm_input}' -> {entry['gloss']}")
        
        # If no full phrase match, try word-by-word and multi-word combinations
        if not valid_videos:
            words = norm_input.split()
            i = 0
            while i < len(words):
                matched = False
                
                # Try longest phrase first (up to 4 words)
                for phrase_len in range(min(4, len(words) - i), 0, -1):
                    phrase = " ".join(words[i:i+phrase_len])
                    
                    # Exact match
                    if phrase in self.normalized_gloss_map:
                        entry = self.normalized_gloss_map[phrase]
                        if os.path.exists(entry["full_path"]):
                            valid_videos.append(entry["full_path"])
                            final_glosses.append(entry["gloss"])
                            print(f"[LSF DEBUG] ✅ Phrase match: '{phrase}' -> {entry['gloss']}")
                            i += phrase_len
                            matched = True
                            break
                    
                    # Fuzzy match (only for single words to avoid false positives)
                    if phrase_len == 1:
                        close = difflib.get_close_matches(phrase, self.normalized_gloss_map.keys(), n=1, cutoff=0.8)
                        if close:
                            entry = self.normalized_gloss_map[close[0]]
                            if os.path.exists(entry["full_path"]):
                                valid_videos.append(entry["full_path"])
                                final_glosses.append(entry["gloss"])
                                print(f"[LSF DEBUG] ✅ Fuzzy match: '{phrase}' -> {entry['gloss']}")
                                i += 1
                                matched = True
                                break
                
                if not matched:
                    print(f"[LSF DEBUG] ⚠️ No local match for word: '{words[i]}'")
                    i += 1
        
        print(f"[LSF DEBUG] Local matching found {len(valid_videos)} videos")
        
        # --- PHASE 2: LLM FALLBACK (only if local matching found nothing) ---
        if not valid_videos:
            print("[LSF DEBUG] Trying LLM fallback...")
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a translator from French/Derja to Tunisian Sign Language (LSF).
                You have access to a specific list of available signs/videos.
                
                Your task:
                1. Analyze the input text.
                2. Map keywords to the closest available sign gloss from the provided list.
                3. If a word has no direct match, look for synonyms or related medical terms in the list.
                4. If a phrase (like 'salut ca va') exists as a single gloss, map it to that gloss.
                5. If absolutely no match found, mark it as "unmapped".
                6. Return a JSON object with a list of "matches" in order.
                
                Available Signs: {sample_glosses}
                
                Output Format:
                {{
                    "matches": [
                        {{ "word": "original_word_or_phrase", "gloss_match": "exact_gloss_from_list", "filename": "filename.mp4" }}
                    ],
                    "unmapped": ["word1", "word2"]
                }}
                """),
                ("user", "{input}")
            ])
            
            unique_glosses = sorted(list(set(self.available_glosses)))
            keys_text = ", ".join(unique_glosses)
            
            chain = prompt | self.llm | JsonOutputParser()
            
            try:
                result = await chain.ainvoke({
                    "input": text,
                    "sample_glosses": keys_text
                })
                print(f"[LSF DEBUG] LLM Result: {result}")
                
                # Process LLM matches
                for match in result.get("matches", []):
                    filename = match.get("filename")
                    gloss = match.get("gloss_match")
                    
                    entry = None
                    
                    if filename and filename in self.filename_map:
                        entry = self.filename_map[filename]
                    elif gloss and gloss in self.gloss_map:
                        entry = self.gloss_map[gloss]
                    elif gloss:
                        norm_gloss = normalize_text(gloss)
                        if norm_gloss in self.normalized_gloss_map:
                            entry = self.normalized_gloss_map[norm_gloss]
                        else:
                            close_matches = difflib.get_close_matches(norm_gloss, self.normalized_gloss_map.keys(), n=1, cutoff=0.7)
                            if close_matches:
                                entry = self.normalized_gloss_map[close_matches[0]]
                    
                    if entry and os.path.exists(entry["full_path"]):
                        valid_videos.append(entry["full_path"])
                        final_glosses.append(entry["gloss"])
                        print(f"[LSF DEBUG] ✅ LLM Matched: {entry['gloss']}")
                    
            except Exception as e:
                print(f"[LSF DEBUG] LLM Error: {e}")
        
        # --- PHASE 3: Video Generation ---
        video_path = None
        error_msg = None

        print(f"[LSF DEBUG] Valid videos to concatenate: {len(valid_videos)} -> {valid_videos}")

        if valid_videos:
            try:
                video_path = await self.video_processor.concatenate_videos(valid_videos)
                print(f"[LSF DEBUG] ✅ Video generated: {video_path}")
            except Exception as e:
                import traceback
                trace = traceback.format_exc()
                print(f"[LSF DEBUG] ❌ Video Processing Error: {trace}")
                error_msg = f"Video processing failed: {str(e)}"
        else:
            error_msg = "No valid signs found for video generation"
            print(f"[LSF DEBUG] ⚠️ {error_msg}")

        return {
            "video_path": video_path,
            "glosses": final_glosses,
            "metadata": {},
            "error": error_msg,
            "fallback_mode": video_path is None
        }

    def get_all_glosses(self) -> List[str]:
        return list(set(self.available_glosses))

# Global instance
lsf_service = LSFService()
def get_lsf_service():
    return lsf_service
