# Migration Design: ChromaDB ➜ Upstash Vector Database

Author: You (with Copilot)
Date: 2025-11-01
Status: Proposed

## Executive summary
We will replace the local ChromaDB + Ollama embedding pipeline with the serverless, cloud-hosted Upstash Vector Database using its built-in embedding model `mixedbread-ai/mxbai-embed-large-v1`. Upstash automatically vectorizes text on upsert and query, so we will stop generating embeddings manually. The RAG UX remains the same (ingest food-domain content; retrieve top-k passages via semantic search; answer using the existing LLM), but infrastructure moves from local to managed.

Key properties from Upstash docs:
- Built-in embedding model: `mixedbread-ai/mxbai-embed-large-v1`
- Vector size: 1024 dims; sequence length: 512 tokens; MTEB: 64.68
- Automatic text vectorization: upsert/query with raw strings
- Serverless + HTTPS REST API (and official Python client)
- Cosine similarity for semantic search (dense indexes)

Reference: Upstash docs – Embedding Models: https://upstash.com/docs/vector/features/embeddingmodels

---

## Architecture comparison

### Before (current)
- Ingestion
  - Source: Food domain data files
  - Chunking: local splitter (e.g., tokens/chars)
  - Embedding: Ollama `mxbai-embed-large` (client-side)
  - Vector store: ChromaDB (local)
  - Upsert: pre-computed vectors + metadata ➜ ChromaDB
- Query
  - Embed query via Ollama ➜ vector
  - Similarity search in Chroma
  - Rerank/format
  - Answer via your existing LLM (e.g., Groq)

### After (target)
- Ingestion
  - Source: Food domain data files (unchanged)
  - Chunking: same splitter and metadata
  - Upsert: raw text + metadata ➜ Upstash Vector (model: `mxbai-embed-large-v1`)
    - Upstash auto-embeds server-side
- Query
  - Send raw query text to Upstash ➜ top-k matches (cosine)
  - Rerank/format (optional)
  - Answer via existing LLM (Groq) – no change

Result: embedding generation is removed entirely from application code.

---

## Detailed implementation plan

1) Provision Upstash Vector index
- In the Upstash console, create a Vector database selecting `mixedbread-ai/mxbai-embed-large-v1`.
- Capture credentials into project root `.env`:
  - `UPSTASH_VECTOR_REST_URL`
  - `UPSTASH_VECTOR_REST_TOKEN` (read-write, use only in ingestion/admin code)
  - `UPSTASH_VECTOR_REST_READONLY_TOKEN` (use for online query paths)

2) Add dependency (Python)
- Install official client (import path shown in docs):
  - Package name: `upstash-vector` (import: `from upstash_vector import Index`)
- Pin in `requirements.txt` (new):
  - `upstash-vector>=0.1.0` (verify exact latest on install)
  - `python-dotenv>=1.0.0` (load env)
  - Plus any existing deps (requests, rich, etc.)

3) Abstract the vector store
- Create `upstash_client.py` with a thin wrapper over `Index` for:
  - `upsert_texts(items: list[tuple[str, str, dict]]) -> None`  # [(id, text, metadata)]
  - `query_text(query: str, top_k: int = 5, filters: dict | None = None) -> list[dict]`
  - Optional: namespace support, metadata filtering
- Benefits: Easy testing and future portability.

4) Update ingestion pipeline
- Rename `embed_digitaltwin.py` ➜ `ingest_digitaltwin.py` (optional but clearer).
- Replace any local embedding generation with direct `Index.upsert` using raw text and metadata.
- Use deterministic IDs (e.g., file:offset) to enable idempotent re-ingest.
- Respect token limits: keep chunk sizes so typical text fits the model’s 512 token sequence length for better accuracy.

5) Update query pipeline
- Replace vectorize-and-query with `Index.query(data=query, top_k=k, include_metadata=True)`.
- Prefer the READONLY token in runtime paths.
- Keep downstream RAG steps (formatting, LLM answer) unchanged.

6) Authentication and configuration
- Load `UPSTASH_VECTOR_REST_URL` and the appropriate token from `.env`.
- For ingestion scripts or CI jobs, use read-write token; for production serving paths, use read-only token.
- Do NOT log tokens. Fail fast if tokens are missing.

7) Error handling and resilience
- Timeouts: set reasonable HTTP timeouts on the client.
- Retries: enable exponential backoff for transient network errors and 5xx; handle 429 (rate limiting) with retry-after.
- Input validation: skip empty texts, sanitize overly long chunks, enforce ID uniqueness.
- Partial failures: batch upserts; log per-record failures with IDs for replays.

8) Cutover strategy
- Optional dual-write (Chroma + Upstash) for a short window to compare results.
- Sanity test recall/precision on a known set of queries.
- Switch read path to Upstash; keep a rollback flag to revert to Chroma (temporarily) during validation window.

9) Decommission
- Remove Ollama embedding dependency and ChromaDB artifacts.
- Archive local embedding caches if any; update docs.

---

## Code structure changes

Proposed Python layout within `digital-twin-workshop/`:

```
.digital-twin-workshop/
  data/
  ingest_digitaltwin.py           # was embed_digitaltwin.py: now pure text + metadata upsert
  digital_twin_mcp_server.py      # query path uses Upstash Index.query
  upstash_client.py               # small wrapper around Upstash Index
  settings.py                     # loads env vars (URL, tokens)
  requirements.txt                # pin dependencies
  tests/
    test_upstash_smoke.py         # small E2E test (skips if no creds)
```

Key modules and responsibilities:
- `settings.py`
  - Reads env, validates presence; exposes `UPSTASH_URL`, `UPSTASH_RW_TOKEN`, `UPSTASH_RO_TOKEN`.
- `upstash_client.py`
  - Holds the configured `Index` and provides helper methods for upsert/query; adds retries and timeouts.
- `ingest_digitaltwin.py`
  - Loads documents, chunks, constructs `(id, text, metadata)` items, upserts in batches.
- `digital_twin_mcp_server.py`
  - Replaces Chroma retrieval with Upstash `query`, keeps LLM answer composition unchanged.

---

## API differences and implications

| Concern | ChromaDB (before) | Upstash Vector (after) |
|---|---|---|
| Embedding | Client-generated (Ollama) | Automatic server-side via selected model |
| Upsert payload | IDs + vectors + metadata | IDs + raw text + metadata |
| Query payload | Vector (embedded query) | Raw text query; Upstash embeds and searches |
| Similarity | Configurable, often cosine | Cosine for dense indexes |
| Client | Local Python client | Official Python client or REST over HTTPS |
| Indexing | Local files | Managed, serverless; per-index model selection |
| Filtering | Where supported by Chroma | Metadata filtering, namespaces (see docs) |

Implications:
- Remove all embedding code paths and any storage of local vectors.
- Ensure original source text exists for re-ingest (embeddings cannot be back-calculated).
- Chunking strategy remains critical to recall/precision and performance.

---

## Minimal code sketches (Python)

Install (examples; do not commit secrets):

```bash
# requirements.txt (example)
upstash-vector>=0.1.0
python-dotenv>=1.0.0
```

Client wrapper (`upstash_client.py`):

```python
from typing import Iterable, Tuple, Dict, Any, List, Optional
import os
from upstash_vector import Index

UPSTASH_URL = os.environ.get("UPSTASH_VECTOR_REST_URL")
UPSTASH_RW_TOKEN = os.environ.get("UPSTASH_VECTOR_REST_TOKEN")
UPSTASH_RO_TOKEN = os.environ.get("UPSTASH_VECTOR_REST_READONLY_TOKEN")

class UpstashVectorClient:
    def __init__(self, read_only: bool = True):
        token = (UPSTASH_RO_TOKEN if read_only else UPSTASH_RW_TOKEN) or ""
        if not UPSTASH_URL or not token:
            raise RuntimeError("Missing Upstash credentials")
        self.index = Index(url=UPSTASH_URL, token=token)

    def upsert_texts(self, items: Iterable[Tuple[str, str, Dict[str, Any]]]) -> None:
        # items: [(id, text, metadata)]
        # Consider batching here if the dataset is large
        self.index.upsert(list(items))

    def query_text(self, query: str, top_k: int = 5, include_metadata: bool = True, filters: Optional[Dict[str, Any]] = None):
        return self.index.query(
            data=query,
            top_k=top_k,
            include_metadata=include_metadata,
            **({"filter": filters} if filters else {})
        )
```

Ingestion (`ingest_digitaltwin.py`):

```python
from upstash_client import UpstashVectorClient

# load your food-domain data, split into chunks
# for each chunk, build: (id, chunk_text, {"source": file_path, "chunk": i})

items = []  # populate this with (id, text, metadata)
client = UpstashVectorClient(read_only=False)
client.upsert_texts(items)
```

Query (`digital_twin_mcp_server.py` retrieval part):

```python
from upstash_client import UpstashVectorClient

client = UpstashVectorClient(read_only=True)
res = client.query_text(user_query, top_k=5, include_metadata=True)
# res contains matches with text + metadata; feed to your LLM prompt builder
```

The above follows Upstash docs pattern: provide raw text at upsert and query time – Upstash handles embeddings.

---

## Error handling strategies

- Credential validation: On startup, fail fast if URL/token are missing; prefer readonly token in user-serving paths.
- Timeouts: Configure HTTP timeouts (client default is fine; consider 5–10s upper bound); surface user-friendly errors with retry suggestions.
- Retries: Exponential backoff for transient 5xx/429; cap attempts; log final failures with request IDs if available.
- Input constraints: Skip empty strings; truncate/summarize extreme-length chunks to fit model’s sequence length guidance (512 tokens) for better accuracy.
- Idempotency: Deterministic IDs to avoid duplicate entries; safe re-runs of ingestion.
- Partial upserts: Batch; continue on error while recording failed IDs for replay.

---

## Performance considerations

- Latency: Network call to a serverless DB adds RTT vs local Chroma; mitigate with batching, connection reuse, and keeping top_k modest.
- Chunking: Tune chunk size and overlap to fit within the 512-token sequence length to avoid excessive truncation and recall loss.
- Batching upserts: Use batches sized to stay below typical payload sizes (e.g., 100–500 chunks depending on content size); measure.
- Read-only token for queries: reduces risk and can be distributed safely to services.
- Filtering/namespaces: Use metadata filters and namespaces to narrow search scope and reduce result scanning.
- Caching: Optional in-app cache for frequent queries if the domain is stable.

---

## Cost implications (cloud vs local)

- Chroma (local): No direct infra bill; costs are developer time + local compute/storage; limited scaling; persistence/config overhead.
- Upstash (cloud/serverless): Pay for storage and requests; scales automatically; no server management; predictable per-request cost model; network egress applies.
- Operational tradeoff: Cloud improves reliability and scale; local is cheaper for tiny/offline dev but lacks managed availability.

(Consult Upstash pricing for exact numbers; avoid hard-coding costs in code.)

---

## Security considerations

- Secrets hygiene: Keep `UPSTASH_VECTOR_REST_TOKEN` and `UPSTASH_VECTOR_REST_READONLY_TOKEN` in `.env` and ensure `.gitignore` excludes them (done).
- Principle of least privilege: Use read-only token for online query; restrict read-write token to ingestion/admin contexts.
- Transport: All calls over HTTPS to the REST URL.
- Logging: Never log full tokens or sensitive payloads; scrub PII from metadata if not strictly required.
- Rotation: Be prepared to rotate tokens; document the process; store secrets in your secret manager for production.

---

## Test plan and success criteria

- Unit tests:
  - Env loading fails fast when credentials are missing.
  - Wrapper methods validate inputs and surface exceptions cleanly.
- Integration smoke test (opt-in):
  - Upsert 3–5 small dummy chunks; query for a known term; assert top_k>0 and include_metadata returns source markers.
- Regression: RAG answer quality comparable or better on a small benchmark set.
- Operational: No secret leaks; query path uses readonly token; ingestion completes within expected time.

---

## Rollout checklist

- [ ] Upstash index created with `mixedbread-ai/mxbai-embed-large-v1`
- [ ] `.env` updated with URL and tokens; readonly used in serving path
- [ ] `requirements.txt` updated; dependencies installed
- [ ] `upstash_client.py` implemented; ingestion/query paths switched
- [ ] Basic smoke test green
- [ ] Remove Ollama embedding + Chroma code and docs
- [ ] Monitor and tune chunk sizes, top_k, filters

---

## Appendix: Direct client usage (from Upstash docs)

Python upsert:

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

index.upsert(
    [("id-0", "Upstash is a serverless data platform.", {"field": "value"})],
)
```

Python query:

```python
from upstash_vector import Index

index = Index(
    url="UPSTASH_VECTOR_REST_URL",
    token="UPSTASH_VECTOR_REST_TOKEN",
)

index.query(
    data="What is Upstash?",
    top_k=1,
    include_metadata=True,
)
```

Source: https://upstash.com/docs/vector/features/embeddingmodels
