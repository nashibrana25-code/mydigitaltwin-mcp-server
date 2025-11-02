"""
Groq API Streaming Example
Demonstrates real-time streaming responses from Groq
"""

from groq_client import generate_response_streaming
from settings import Settings

def main():
    """Example of streaming Groq API responses"""
    
    # Validate environment
    Settings.validate_or_raise()
    
    print("=" * 60)
    print("🎬 Groq Streaming Example")
    print("=" * 60)
    print("\nThis demonstrates real-time streaming from Groq's API.")
    print("Watch the response appear word-by-word!\n")
    
    # Example 1: Simple streaming
    print("Example 1: Simple Question")
    print("-" * 60)
    print("Question: What is Python?\n")
    print("Response: ", end="", flush=True)
    
    for chunk in generate_response_streaming(
        prompt="What is Python? Answer in 2-3 sentences.",
        system_prompt="You are a helpful programming tutor. Be concise.",
        temperature=1.0,
        max_tokens=200
    ):
        print(chunk, end="", flush=True)
    
    print("\n")
    
    # Example 2: Technical explanation
    print("\nExample 2: Technical Explanation")
    print("-" * 60)
    print("Question: Explain APIs in simple terms.\n")
    print("Response: ", end="", flush=True)
    
    for chunk in generate_response_streaming(
        prompt="Explain what an API is to a non-technical person in 2 sentences.",
        system_prompt="You are a tech explainer. Use simple analogies.",
        temperature=0.7,
        max_tokens=150
    ):
        print(chunk, end="", flush=True)
    
    print("\n")
    
    # Example 3: Interactive mode
    print("\n" + "=" * 60)
    print("🎤 Interactive Streaming Mode")
    print("=" * 60)
    print("Ask your own questions! Type 'exit' to quit.\n")
    
    while True:
        question = input("You: ").strip()
        
        if question.lower() in ['exit', 'quit', 'q']:
            print("\n👋 Goodbye!")
            break
        
        if not question:
            continue
        
        print("\n🤖 AI: ", end="", flush=True)
        
        try:
            for chunk in generate_response_streaming(
                prompt=question,
                temperature=0.8,
                max_tokens=300
            ):
                print(chunk, end="", flush=True)
            print("\n")
        except Exception as e:
            print(f"\n❌ Error: {e}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
