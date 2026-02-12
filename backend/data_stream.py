"""
Vercel AI SDK Data Stream Protocol encoder.

The frontend's useChat() hook expects this line-based format:
    f:{"messageId":"msg-xxx"}\n       -- start message
    0:"text chunk"\n                  -- text delta (JSON-encoded string)
    e:{"finishReason":"stop",...}\n   -- step finish
    d:{"finishReason":"stop",...}\n   -- message done
"""

import json
import uuid
from typing import AsyncIterator


def _encode_text_delta(text: str) -> str:
    return f"0:{json.dumps(text)}\n"


def _encode_start() -> str:
    msg_id = f"msg-{uuid.uuid4().hex[:24]}"
    return f'f:{{"messageId":"{msg_id}"}}\n'


def _encode_step_finish() -> str:
    return 'e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n'


def _encode_done() -> str:
    return 'd:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'


async def format_data_stream(chunks: AsyncIterator[str]) -> AsyncIterator[str]:
    """Wrap an async iterator of text chunks in Vercel AI SDK data stream protocol."""
    yield _encode_start()

    async for text in chunks:
        if text:
            yield _encode_text_delta(text)

    yield _encode_step_finish()
    yield _encode_done()
