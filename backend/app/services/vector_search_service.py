"""
VectorSearchService - Semantic product search using Qdrant + SigLIP
Uses pre-ingested product embeddings from BaronsMarket
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "products")
MODEL_PATH = os.getenv("MODEL_PATH", "google/siglip-so400m-patch14-384")


class VectorSearchService:
    """Service for semantic product search using Qdrant vector database."""
    
    def __init__(self, lazy_load: bool = True):
        """
        Initialize the vector search service.
        
        Args:
            lazy_load: If True, load ML model only when first search is performed.
                      This speeds up server startup.
        """
        self._model = None
        self._processor = None
        self._client = None
        self._device = None
        self._lazy_load = lazy_load
        
        if not lazy_load:
            self._initialize()
    
    def _initialize(self):
        """Initialize Qdrant client and optionally load ML model."""
        from qdrant_client import QdrantClient
        
        self._client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        print(f"✅ Connected to Qdrant: {QDRANT_URL}")
    
    def _load_model(self):
        """Load SigLIP model for embedding generation (lazy loading)."""
        if self._model is not None:
            return
            
        import torch
        from transformers import SiglipModel, SiglipProcessor
        
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading model: {MODEL_PATH} on {self._device}...")
        
        token = os.getenv("HF_TOKEN")
        self._model = SiglipModel.from_pretrained(MODEL_PATH, token=token).to(self._device)
        self._processor = SiglipProcessor.from_pretrained(MODEL_PATH, token=token)
        print(f"✅ Model loaded on {self._device}")
    
    def _ensure_initialized(self):
        """Ensure client is initialized."""
        if self._client is None:
            self._initialize()
    
    def _get_text_embedding(self, text: str) -> List[float]:
        """Generate embedding for text query."""
        import torch
        
        self._load_model()
        
        inputs = self._processor(text=[text], padding="max_length", return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = None
            embedding = None
            
            # Try get_text_features first
            if hasattr(self._model, 'get_text_features'):
                outputs = self._model.get_text_features(**inputs)
            else:
                outputs = self._model(**inputs)
                if hasattr(outputs, 'text_embeds'):
                    embedding = outputs.text_embeds
            
            # Extract embedding from outputs
            if embedding is None and outputs is not None:
                if isinstance(outputs, torch.Tensor):
                    embedding = outputs
                elif hasattr(outputs, 'pooler_output'):
                    embedding = outputs.pooler_output
                elif hasattr(outputs, 'last_hidden_state'):
                    embedding = outputs.last_hidden_state[:, 0]
                elif hasattr(outputs, 'text_embeds'):
                    embedding = outputs.text_embeds
                else:
                    embedding = outputs[0] if hasattr(outputs, '__getitem__') else outputs
            
            # Normalize
            if embedding is not None and hasattr(embedding, 'norm'):
                embedding = embedding / embedding.norm(dim=-1, keepdim=True)
                return embedding.cpu().numpy()[0].tolist()
            
            return []
    
    def _get_image_embedding(self, image_bytes: bytes) -> List[float]:
        """Generate embedding for image query."""
        import torch
        from PIL import Image
        import io
        
        self._load_model()
        
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        inputs = self._processor(images=[image], padding="max_length", return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = None
            embedding = None
            
            # Try get_image_features first
            if hasattr(self._model, 'get_image_features'):
                outputs = self._model.get_image_features(**inputs)
            else:
                outputs = self._model(**inputs)
                if hasattr(outputs, 'image_embeds'):
                    embedding = outputs.image_embeds
            
            # Extract embedding from outputs
            if embedding is None and outputs is not None:
                if isinstance(outputs, torch.Tensor):
                    embedding = outputs
                elif hasattr(outputs, 'pooler_output'):
                    embedding = outputs.pooler_output
                elif hasattr(outputs, 'last_hidden_state'):
                    embedding = outputs.last_hidden_state[:, 0]
                elif hasattr(outputs, 'image_embeds'):
                    embedding = outputs.image_embeds
                else:
                    embedding = outputs[0] if hasattr(outputs, '__getitem__') else outputs
            
            # Normalize
            if embedding is not None and hasattr(embedding, 'norm'):
                embedding = embedding / embedding.norm(dim=-1, keepdim=True)
                return embedding.cpu().numpy()[0].tolist()
            
            return []
    
    def search_by_text(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search products by text query using semantic similarity.
        
        Args:
            query: Text search query (e.g., "tomato sauce", "chocolate")
            limit: Maximum number of results to return
            
        Returns:
            List of product dictionaries with name, brand, price, score, etc.
        """
        self._ensure_initialized()
        embedding = self._get_text_embedding(query)
        return self._search(embedding, limit)
    
    def search_by_image(self, image_bytes: bytes, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search products by image using visual similarity.
        
        Args:
            image_bytes: Raw image bytes
            limit: Maximum number of results to return
            
        Returns:
            List of product dictionaries with name, brand, price, score, etc.
        """
        self._ensure_initialized()
        embedding = self._get_image_embedding(image_bytes)
        return self._search(embedding, limit)
    
    def _search(self, query_vector: List[float], limit: int) -> List[Dict[str, Any]]:
        """Execute search against Qdrant."""
        try:
            # Try modern API first
            if hasattr(self._client, "query_points"):
                results = self._client.query_points(
                    collection_name=QDRANT_COLLECTION_NAME,
                    query=query_vector,
                    limit=limit
                ).points
            else:
                # Fallback to older API
                results = self._client.search(
                    collection_name=QDRANT_COLLECTION_NAME,
                    query_vector=query_vector,
                    limit=limit
                )
        except Exception as e:
            print(f"Search error: {e}")
            return []
        
        products = []
        for hit in results:
            payload = hit.payload
            products.append({
                "product_id": payload.get("product_id"),
                "name": payload.get("name"),
                "brand": payload.get("brand"),
                "price": payload.get("price"),
                "image_file": payload.get("image_file"),
                "category_folder": payload.get("category_folder"),
                "score": hit.score
            })
        
        return products
    
    def get_all_products(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get all products from the collection (paginated).
        
        Args:
            limit: Number of products to return
            offset: Offset for pagination
            
        Returns:
            List of product dictionaries
        """
        self._ensure_initialized()
        
        try:
            # Scroll through all points
            records, _ = self._client.scroll(
                collection_name=QDRANT_COLLECTION_NAME,
                limit=limit,
                offset=offset,
                with_payload=True,
                with_vectors=False
            )
            
            products = []
            for record in records:
                payload = record.payload
                products.append({
                    "product_id": payload.get("product_id"),
                    "name": payload.get("name"),
                    "brand": payload.get("brand"),
                    "price": payload.get("price"),
                    "image_file": payload.get("image_file"),
                    "category_folder": payload.get("category_folder")
                })
            
            return products
            
        except Exception as e:
            print(f"Error fetching products: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the Qdrant collection."""
        self._ensure_initialized()
        
        try:
            info = self._client.get_collection(QDRANT_COLLECTION_NAME)
            # Handle different Qdrant client versions
            vectors_count = getattr(info, 'vectors_count', None) or getattr(info, 'points_count', None)
            points_count = getattr(info, 'points_count', None)
            status = getattr(info, 'status', 'unknown')
            
            # Convert status enum to string if needed
            if hasattr(status, 'value'):
                status = status.value
            elif hasattr(status, 'name'):
                status = status.name
            else:
                status = str(status)
            
            return {
                "name": QDRANT_COLLECTION_NAME,
                "vectors_count": vectors_count,
                "points_count": points_count,
                "status": status
            }
        except Exception as e:
            return {
                "name": QDRANT_COLLECTION_NAME,
                "error": str(e)
            }


# Singleton instance for reuse
_vector_search_service: Optional[VectorSearchService] = None


def get_vector_search_service() -> VectorSearchService:
    """Get or create the vector search service singleton."""
    global _vector_search_service
    if _vector_search_service is None:
        _vector_search_service = VectorSearchService(lazy_load=True)
    return _vector_search_service
