"""
Groq AI Integration
Handles LLM inference using Groq's ultra-fast API with LLaMA models
Supports both streaming and non-streaming responses
"""

import time
from typing import Optional, Iterator
from groq import Groq
from settings import Settings

DEFAULT_MODEL = "llama-3.1-8b-instant"
MAX_RETRIES = 3
RETRY_DELAY_MS = 1000


def get_groq_client() -> Groq:
    """
    Initialize and return Groq client instance
    
    Returns:
        Groq: Configured Groq client
        
    Raises:
        ValueError: If API key is missing
    """
    if not Settings.GROQ_API_KEY:
        raise ValueError("Missing required environment variable: GROQ_API_KEY")
    
    try:
        client = Groq(api_key=Settings.GROQ_API_KEY)
        return client
    except Exception as error:
        print(f"❌ Failed to initialize Groq client: {error}")
        raise RuntimeError(f"Failed to initialize Groq client: {error}")


def generate_response(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    stream: bool = False
) -> str | Iterator[str]:
    """
    Generate AI response using Groq with context and retry logic
    
    Args:
        prompt: User prompt/question
        system_prompt: System instructions for the AI (optional)
        model: Groq model to use (default: llama-3.1-8b-instant)
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens in response
        stream: If True, returns an iterator for streaming; if False, returns complete string
        
    Returns:
        str | Iterator[str]: Generated response text or streaming iterator
        
    Raises:
        ValueError: If prompt is invalid
        RuntimeError: If generation fails after retries
    """
    start_time = time.time()
    
    # Input validation
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    
    if len(prompt) > 8000:
        print("⚠️ Prompt is very long, truncating to 8000 characters")
        prompt = prompt[:8000]
    
    client = get_groq_client()
    default_system_prompt = (
        "You are an AI digital twin. Answer questions as if you are the person, "
        "speaking in first person about your background, skills, and experience."
    )
    
    last_error = None
    
    # Retry loop for transient failures
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"🤖 Generating response with Groq (attempt {attempt}/{MAX_RETRIES})...")
            
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt or default_system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=1,
                stream=stream,
                stop=None
            )
            
            # Handle streaming response
            if stream:
                def stream_generator():
                    """Generator for streaming chunks"""
                    try:
                        for chunk in completion:
                            content = chunk.choices[0].delta.content
                            if content:
                                yield content
                    except Exception as e:
                        print(f"❌ Streaming error: {e}")
                        yield f"\n[Error: {e}]"
                
                print(f"✓ Streaming response initiated")
                return stream_generator()
            
            # Handle non-streaming response
            duration_ms = int((time.time() - start_time) * 1000)
            response = completion.choices[0].message.content.strip() if completion.choices else None
            
            if not response:
                raise RuntimeError("Groq returned empty response")
            
            print(f"✓ Response generated in {duration_ms}ms ({len(response)} chars)")
            
            return response
            
        except Exception as error:
            last_error = error
            duration_ms = int((time.time() - start_time) * 1000)
            
            print(f"❌ Groq generation failed (attempt {attempt}/{MAX_RETRIES}) after {duration_ms}ms: {error}")
            
            error_msg = str(error).lower()
            
            # Handle specific Groq API errors
            
            # Rate limit errors
            if "429" in error_msg or "rate limit" in error_msg:
                print("⚠️ Rate limit hit, waiting before retry...")
                if attempt < MAX_RETRIES:
                    time.sleep((RETRY_DELAY_MS * attempt) / 1000)  # Exponential backoff
                    continue
                raise RuntimeError("Groq API rate limit exceeded. Please try again later.")
            
            # Authentication errors
            if "401" in error_msg or "unauthorized" in error_msg:
                raise RuntimeError("Invalid Groq API key. Please check your credentials.")
            
            # Model not found
            if "404" in error_msg or "model_not_found" in error_msg:
                raise RuntimeError(f"Model '{model}' not found. Please use a valid Groq model.")
            
            # Timeout errors
            if "timeout" in error_msg:
                print("⚠️ Request timeout, retrying...")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY_MS / 1000)
                    continue
                raise RuntimeError("Groq API request timed out. Please try again.")
            
            # Retry for other transient errors
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_MS / 1000)
                continue
    
    # If all retries failed
    raise RuntimeError(
        f"Failed to generate response after {MAX_RETRIES} attempts: {last_error}"
    )


def generate_response_streaming(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 1.0,
    max_tokens: int = 1024
) -> Iterator[str]:
    """
    Generate streaming AI response using Groq
    This is a convenience wrapper around generate_response with stream=True
    
    Args:
        prompt: User prompt/question
        system_prompt: System instructions for the AI (optional)
        model: Groq model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens in response
        
    Yields:
        str: Chunks of the generated response
        
    Example:
        >>> for chunk in generate_response_streaming("Tell me about Python"):
        ...     print(chunk, end="", flush=True)
    """
    result = generate_response(
        prompt=prompt,
        system_prompt=system_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True
    )
    
    # result is an iterator
    yield from result


def validate_groq_connection() -> bool:
    """
    Validate Groq API connection
    
    Returns:
        bool: True if connection is valid
    """
    try:
        print("🔍 Validating Groq API connection...")
        generate_response("Test", "Respond with 'OK'", DEFAULT_MODEL)
        print("✓ Groq API connection validated")
        return True
    except Exception as error:
        print(f"❌ Groq API connection validation failed: {error}")
        return False


if __name__ == "__main__":
    """Test the Groq client"""
    print("=" * 60)
    print("Testing Groq Client")
    print("=" * 60)
    
    # Test settings
    Settings.print_status()
    
    try:
        Settings.validate_or_raise()
    except ValueError as e:
        print(f"❌ {e}")
        exit(1)
    
    # Test connection
    if not validate_groq_connection():
        print("❌ Connection test failed")
        exit(1)
    
    print("\n" + "=" * 60)
    print("Testing Non-Streaming Response")
    print("=" * 60)
    
    # Test non-streaming
    try:
        response = generate_response(
            "What is Python?",
            "You are a helpful programming tutor. Be concise.",
            temperature=0.7,
            max_tokens=200
        )
        print(f"\n📝 Response:\n{response}\n")
    except Exception as e:
        print(f"❌ Non-streaming test failed: {e}")
    
    print("\n" + "=" * 60)
    print("Testing Streaming Response")
    print("=" * 60)
    
    # Test streaming
    try:
        print("\n📝 Streaming Response:")
        for chunk in generate_response_streaming(
            "Explain what an API is in one sentence.",
            "You are a helpful tech explainer. Be very concise.",
            temperature=1.0,
            max_tokens=100
        ):
            print(chunk, end="", flush=True)
        print("\n")
    except Exception as e:
        print(f"\n❌ Streaming test failed: {e}")
    
    print("=" * 60)
    print("✓ All tests completed")
    print("=" * 60)
