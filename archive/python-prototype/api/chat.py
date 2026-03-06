"""
Vercel Serverless Function - Digital Twin RAG API
"""

from http.server import BaseHTTPRequestHandler
import json
import os
from urllib.parse import parse_qs

# Import your existing modules
import sys
sys.path.append(os.path.dirname(__file__))

from settings import Settings
from groq_client import generate_response
from upstash_client import UpstashVectorClient


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests to /api/chat"""
        try:
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)
            
            question = data.get('question', '')
            
            if not question:
                self.send_error(400, "Missing 'question' in request body")
                return
            
            # Initialize vector client (read-only)
            vector_client = UpstashVectorClient(read_only=True)
            
            # Query vectors
            results = vector_client.query_text(question, top_k=3)
            
            # Build context
            context_docs = []
            for result in results:
                metadata = result.get('metadata', {})
                content = metadata.get('content', '')
                if content:
                    context_docs.append(content)
            
            if not context_docs:
                answer = "I don't have specific information about that topic."
            else:
                context = "\n\n".join(context_docs)
                prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
                
                answer = generate_response(prompt, temperature=0.7, max_tokens=500)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'answer': answer,
                'sources': len(results)
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def do_GET(self):
        """Health check"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'ok', 'service': 'Digital Twin API'}).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
