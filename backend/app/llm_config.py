import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:1234/v1/chat/completions")
LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "google/gemma-4-12b-qat")
LOCAL_LLM_REASONING = os.getenv("LOCAL_LLM_REASONING", "off").lower()


def reasoning_enabled() -> bool:
    return LOCAL_LLM_REASONING in ("on", "true", "1", "yes")


def llm_request_options() -> dict[str, Any]:
    """Extra LM Studio parameters. Sends reasoning_effort=none when disabled."""
    if reasoning_enabled():
        return {}
    return {
        "reasoning_effort": "none",
        "chat_template_kwargs": {"enable_thinking": False},
    }


def extract_llm_message_content(response_data: dict) -> str:
    message = response_data.get("choices", [{}])[0].get("message", {})
    return (message.get("content") or "").strip()
