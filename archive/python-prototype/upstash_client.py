"""
Upstash Vector Client
Wrapper around Upstash Vector Database for automatic text embedding and semantic search
"""

from typing import Iterable, Tuple, Dict, Any, List, Optional
from upstash_vector import Index
from settings import Settings


class UpstashVectorClient:
    """
    Client for Upstash Vector Database operations
    Handles automatic text embedding using mixedbread-ai/mxbai-embed-large-v1
    """
    
    def __init__(self, read_only: bool = True):
        """
        Initialize Upstash Vector client
        
        Args:
            read_only: If True, uses read-only token; if False, uses read-write token
            
        Raises:
            ValueError: If credentials are missing
        """
        url = Settings.UPSTASH_VECTOR_REST_URL
        token = (
            Settings.UPSTASH_VECTOR_REST_READONLY_TOKEN 
            if read_only 
            else Settings.UPSTASH_VECTOR_REST_TOKEN
        )
        
        if not url:
            raise ValueError("Missing UPSTASH_VECTOR_REST_URL in environment")
        
        if not token:
            token_type = "READONLY_TOKEN" if read_only else "TOKEN"
            raise ValueError(f"Missing UPSTASH_VECTOR_REST_{token_type} in environment")
        
        try:
            self.index = Index(url=url, token=token)
            self.read_only = read_only
            print(f"✓ Upstash Vector client initialized ({'read-only' if read_only else 'read-write'} mode)")
        except Exception as error:
            raise RuntimeError(f"Failed to initialize Upstash Vector client: {error}")
    
    def upsert_texts(
        self, 
        items: Iterable[Tuple[str, str, Dict[str, Any]]]
    ) -> None:
        """
        Upsert text data with automatic embedding
        
        Args:
            items: Iterable of (id, text, metadata) tuples
                - id: Unique identifier for the vector
                - text: Raw text to embed (Upstash will auto-embed)
                - metadata: Dictionary of metadata to store
        
        Raises:
            RuntimeError: If client is in read-only mode
            Exception: If upsert fails
        
        Example:
            >>> client = UpstashVectorClient(read_only=False)
            >>> items = [
            ...     ("doc1", "Python is a programming language", {"source": "docs"}),
            ...     ("doc2", "JavaScript is used for web development", {"source": "docs"})
            ... ]
            >>> client.upsert_texts(items)
        """
        if self.read_only:
            raise RuntimeError("Cannot upsert in read-only mode. Initialize with read_only=False")
        
        items_list = list(items)
        print(f"📤 Upserting {len(items_list)} items to Upstash Vector...")
        
        try:
            self.index.upsert(items_list)
            print(f"✓ Successfully upserted {len(items_list)} items")
        except Exception as error:
            print(f"❌ Upsert failed: {error}")
            raise
    
    def query_text(
        self,
        query: str,
        top_k: int = 5,
        include_metadata: bool = True,
        include_vectors: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query the vector database with raw text
        Upstash automatically embeds the query text
        
        Args:
            query: Raw text query (will be auto-embedded)
            top_k: Number of results to return
            include_metadata: Whether to include metadata in results
            include_vectors: Whether to include vector embeddings in results
            filters: Optional metadata filters
        
        Returns:
            List of matching results with scores and metadata
        
        Example:
            >>> client = UpstashVectorClient(read_only=True)
            >>> results = client.query_text("What is Python?", top_k=3)
            >>> for result in results:
            ...     print(f"Score: {result['score']}, Text: {result['metadata']['content']}")
        """
        print(f"🔍 Querying Upstash Vector: '{query[:50]}...' (top_k={top_k})")
        
        try:
            query_params = {
                "data": query,
                "top_k": top_k,
                "include_metadata": include_metadata,
                "include_vectors": include_vectors
            }
            
            if filters:
                query_params["filter"] = filters
            
            results = self.index.query(**query_params)
            
            print(f"✓ Found {len(results)} results")
            return results
            
        except Exception as error:
            print(f"❌ Query failed: {error}")
            raise
    
    def info(self) -> Dict[str, Any]:
        """
        Get information about the vector database
        
        Returns:
            Dictionary with index information (dimension, count, etc.)
        """
        try:
            info_result = self.index.info()
            # Convert InfoResult object to dict
            return {
                'dimension': getattr(info_result, 'dimension', None),
                'vectorCount': getattr(info_result, 'vector_count', getattr(info_result, 'vectorCount', 0)),
                'similarityFunction': getattr(info_result, 'similarity_function', getattr(info_result, 'similarityFunction', 'unknown'))
            }
        except Exception as error:
            print(f"❌ Failed to get index info: {error}")
            raise
    
    def delete(self, ids: List[str]) -> None:
        """
        Delete vectors by ID
        
        Args:
            ids: List of vector IDs to delete
            
        Raises:
            RuntimeError: If client is in read-only mode
        """
        if self.read_only:
            raise RuntimeError("Cannot delete in read-only mode. Initialize with read_only=False")
        
        try:
            self.index.delete(ids)
            print(f"✓ Deleted {len(ids)} vectors")
        except Exception as error:
            print(f"❌ Delete failed: {error}")
            raise
    
    def reset(self) -> None:
        """
        Delete all vectors from the index
        
        Raises:
            RuntimeError: If client is in read-only mode
        """
        if self.read_only:
            raise RuntimeError("Cannot reset in read-only mode. Initialize with read_only=False")
        
        try:
            self.index.reset()
            print("✓ Index reset (all vectors deleted)")
        except Exception as error:
            print(f"❌ Reset failed: {error}")
            raise


if __name__ == "__main__":
    """Test the Upstash Vector client"""
    print("=" * 60)
    print("Testing Upstash Vector Client")
    print("=" * 60)
    
    Settings.print_status()
    
    try:
        Settings.validate_or_raise()
    except ValueError as e:
        print(f"❌ {e}")
        exit(1)
    
    # Test read-only client
    print("\n📊 Testing Read-Only Client")
    print("-" * 60)
    
    try:
        ro_client = UpstashVectorClient(read_only=True)
        
        # Get index info
        info = ro_client.info()
        print(f"\n📈 Index Info:")
        print(f"  Dimension: {info.get('dimension', 'N/A')}")
        print(f"  Vector Count: {info.get('vectorCount', 'N/A')}")
        print(f"  Similarity: {info.get('similarityFunction', 'N/A')}")
        
        # Test query
        print("\n🔍 Testing Query:")
        results = ro_client.query_text("Python programming", top_k=3)
        print(f"  Found {len(results)} results")
        
        if results:
            for i, result in enumerate(results, 1):
                score = result.get('score', 0)
                metadata = result.get('metadata', {})
                print(f"  {i}. Score: {score:.4f}, Metadata: {metadata}")
        
    except Exception as e:
        print(f"❌ Read-only client test failed: {e}")
    
    # Test write client (only if user confirms)
    print("\n" + "=" * 60)
    print("Write operations test (skipped in automated tests)")
    print("To test upsert, run this script interactively")
    print("=" * 60)
