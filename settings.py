"""
Settings Module
Loads and validates environment variables for the Digital Twin Workshop
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""
    
    # Upstash Vector Database
    UPSTASH_VECTOR_REST_URL: str = os.environ.get("UPSTASH_VECTOR_REST_URL", "")
    UPSTASH_VECTOR_REST_TOKEN: str = os.environ.get("UPSTASH_VECTOR_REST_TOKEN", "")
    UPSTASH_VECTOR_REST_READONLY_TOKEN: str = os.environ.get("UPSTASH_VECTOR_REST_READONLY_TOKEN", "")
    
    # Groq API
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    
    @classmethod
    def validate(cls) -> list[str]:
        """
        Validate that all required environment variables are set
        
        Returns:
            List of missing variable names (empty if all valid)
        """
        missing = []
        
        if not cls.UPSTASH_VECTOR_REST_URL:
            missing.append("UPSTASH_VECTOR_REST_URL")
        
        if not cls.UPSTASH_VECTOR_REST_TOKEN:
            missing.append("UPSTASH_VECTOR_REST_TOKEN")
        
        if not cls.GROQ_API_KEY:
            missing.append("GROQ_API_KEY")
        
        return missing
    
    @classmethod
    def validate_or_raise(cls):
        """
        Validate settings and raise error if any are missing
        
        Raises:
            ValueError: If required environment variables are missing
        """
        missing = cls.validate()
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                f"Please add them to your .env file"
            )
    
    @classmethod
    def print_status(cls):
        """Print configuration status (without showing actual values)"""
        print("\n📋 Configuration Status:")
        print(f"  UPSTASH_VECTOR_REST_URL: {'✓ Set' if cls.UPSTASH_VECTOR_REST_URL else '✗ Missing'}")
        print(f"  UPSTASH_VECTOR_REST_TOKEN: {'✓ Set' if cls.UPSTASH_VECTOR_REST_TOKEN else '✗ Missing'}")
        print(f"  UPSTASH_VECTOR_REST_READONLY_TOKEN: {'✓ Set' if cls.UPSTASH_VECTOR_REST_READONLY_TOKEN else '✗ Missing'}")
        print(f"  GROQ_API_KEY: {'✓ Set' if cls.GROQ_API_KEY else '✗ Missing'}")
        print()


# Validate on import (will warn but not fail)
missing = Settings.validate()
if missing:
    print(f"⚠️ Warning: Missing environment variables: {', '.join(missing)}")
    print("   Add them to your .env file for full functionality")
