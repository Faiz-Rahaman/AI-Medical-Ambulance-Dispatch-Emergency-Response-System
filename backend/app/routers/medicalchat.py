import io
import logging
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse
from typing import Optional, cast
from urllib.parse import quote

from .. import models
from ..database import get_db
from ..llm_config import (
    LOCAL_LLM_MODEL,
    LOCAL_LLM_URL,
    extract_llm_message_content,
    llm_request_options,
)
from ..prompts import DEFAULT_MEDICAL_SYSTEM_PROMPT

# Set up logging to see the actual error
logging.basicConfig(level=logging.INFO)

# Check if gTTS is available
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    logging.warning("gTTS not available, will return text responses only")

router = APIRouter()
chat_sessions = {}

class ChatRequest(BaseModel):
    message: str
    session_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def get_system_prompt_text(db: Session) -> str:
    prompt_entry = db.query(models.SystemPrompt).order_by(models.SystemPrompt.id.asc()).first()
    if not prompt_entry:
        prompt_entry = models.SystemPrompt(prompt=DEFAULT_MEDICAL_SYSTEM_PROMPT)
        db.add(prompt_entry)
        db.commit()
        db.refresh(prompt_entry)
    return cast(str, prompt_entry.prompt)

def extract_json_from_llm_response(text: str) -> str:
    """
    Finds and extracts a JSON object from the LLM's structured output.
    Handles various formats including developer commentary.
    """
    import re
    
    # Remove developer commentary tags
    text = re.sub(r'</channel>.*?<\|constrain\|>', '', text, flags=re.DOTALL)
    text = re.sub(r'commentary to.*?developer', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<\|constrain\|>', '', text)
    text = re.sub(r'json<message>', '', text, flags=re.IGNORECASE)
    
    # Check for the structured format with <|message|>
    if "<|message|>" in text:
        try:
            # Split the string at the message tag and take the part after it
            potential_json = text.split("<|message|>")[1]
            # Find the start and end of the JSON object
            start = potential_json.find('{')
            end = potential_json.rfind('}') + 1
            if start != -1 and end != 0:
                return potential_json[start:end]
        except (IndexError, ValueError):
            pass

    # Look for JSON objects in the text
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    json_matches = re.findall(json_pattern, text)
    
    if json_matches:
        # Return the last (most complete) JSON object found
        return json_matches[-1]

    # If no JSON found, return original text
    return text

def is_developer_commentary(text: str) -> bool:
    """Check if the text contains developer commentary that should be hidden from user."""
    import re
    dev_indicators = [
        r'commentary to.*?developer',
        r'</channel>',
        r'<\|constrain\|>',
        r'json<message>',
        r'response_type.*?clarification'
    ]
    
    for pattern in dev_indicators:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def extract_user_message(text: str) -> str:
    """Extract the actual user-facing message from LLM response, removing developer commentary."""
    import re
    
    # If it's developer commentary, try to extract the actual question
    if is_developer_commentary(text):
        # Look for clarification questions
        clarification_match = re.search(r'"question":\s*"([^"]*)"', text)
        if clarification_match:
            return clarification_match.group(1)
        
        # If no question found, return a generic response
        return "I need some additional information to help you."
    
    # Clean up any remaining developer tags
    cleaned_text = re.sub(r'</channel>.*?<\|constrain\|>', '', text, flags=re.DOTALL)
    cleaned_text = re.sub(r'commentary to.*?developer', '', cleaned_text, flags=re.IGNORECASE)
    cleaned_text = re.sub(r'<\|constrain\|>', '', cleaned_text)
    cleaned_text = re.sub(r'json<message>', '', cleaned_text, flags=re.IGNORECASE)
    
    return cleaned_text.strip()

def extract_symptoms_from_history(history: list) -> str:
    """Helper function to combine user messages into a single symptom string."""
    symptoms = []
    for msg in history:
        if msg.get("role") == "user":
            symptoms.append(msg.get("content", ""))
    return ". ".join(symptoms)

def parse_age(age_input: str) -> int:
    """Extract numeric age from various input formats like '8 years old', '25', 'thirty', etc."""
    if not age_input:
        return 0
    
    # Remove common words and keep only numbers
    import re
    # Extract all numbers from the string
    numbers = re.findall(r'\d+', str(age_input))
    if numbers:
        age = int(numbers[0])  # Take the first number found
        # Validate age is reasonable (1-120)
        if 1 <= age <= 120:
            return age
    
    # Handle common text representations
    age_text = str(age_input).lower().strip()
    age_mappings = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    }
    
    for text, num in age_mappings.items():
        if text in age_text:
            return num
    
    return 0  # Default fallback

def clean_phone_number(phone_input: str) -> str:
    """Clean and format phone number input."""
    if not phone_input:
        return ""
    
    # Remove all non-digit characters except +
    import re
    cleaned = re.sub(r'[^\d+]', '', str(phone_input))
    
    # Remove leading + if present for storage
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    
    return cleaned[:15]  # Limit length

def clean_gender(gender_input: str) -> str:
    """Normalize gender input to standard format."""
    if not gender_input:
        return "Other"
    
    gender = str(gender_input).lower().strip()
    
    # Map common variations to standard terms
    if gender in ['male', 'm', 'man', 'boy']:
        return 'Male'
    elif gender in ['female', 'f', 'woman', 'girl']:
        return 'Female'
    else:
        return 'Other'

@router.post("/llm-chat/")
async def llm_chat(
    fastapi_request: Request,
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        llm_url = LOCAL_LLM_URL
        
        system_prompt = get_system_prompt_text(db)

        if request.session_id not in chat_sessions:
            chat_sessions[request.session_id] = [
                {"role": "system", "content": system_prompt}
            ]

        chat_sessions[request.session_id].append({"role": "user", "content": request.message})
        
        payload = {
            "model": LOCAL_LLM_MODEL,
            "messages": chat_sessions[request.session_id],
            "temperature": 0.7,
            "max_tokens": 500,
            **llm_request_options(),
        }
        
        llm_response_text = ""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(llm_url, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()
                llm_response_text = extract_llm_message_content(data)
            except httpx.ConnectError:
                llm_response_text = "I understand you need medical assistance. Can you please describe your symptoms?"
                logging.warning("LLM service not available, using fallback response")
            except Exception as e:
                logging.error(f"LLM request failed: {str(e)}")
                llm_response_text = "I'm here to help with your medical emergency. What symptoms are you experiencing?"

        # --- SMART PARSING LOGIC ---
        # First, extract the user-facing message (clean up developer commentary)
        user_facing_message = extract_user_message(llm_response_text)
        
        # Check if this is developer commentary that should be processed differently
        if is_developer_commentary(llm_response_text):
            # For developer commentary, show the extracted question to user
            llm_response_text = user_facing_message
        else:
            # For normal responses, try to extract JSON for processing
            json_string_from_llm = extract_json_from_llm_response(llm_response_text)
            
            try:
                # Try to parse the CLEANED string
                parsed_json = json.loads(json_string_from_llm)
                
                if parsed_json.get("response_type") == "concise" and "data" in parsed_json:
                    # This is a conversational reply wrapped in JSON, extract the text
                    llm_response_text = parsed_json["data"]

                elif parsed_json.get("response_type") == "json":
                    # This is the final JSON with patient data, proceed to save it
                    patient_data = parsed_json.get("data", {})
                    
                    symptoms = extract_symptoms_from_history(chat_sessions[request.session_id])
                    age_value = patient_data.get("age")
                    parsed_age = parse_age(age_value)
                    cleaned_phone = clean_phone_number(patient_data.get("phone"))
                    cleaned_gender = clean_gender(patient_data.get("gender"))
                    
                    triage_payload = {
                        "name": patient_data.get("name", "").strip(),
                        "age": parsed_age,
                        "gender": cleaned_gender,
                        "contact": cleaned_phone,
                        "symptoms": symptoms,
                        "location": "Location captured via GPS" if request.latitude else "Unknown",
                        "latitude": request.latitude,
                        "longitude": request.longitude,
                    }
                    
                    # Log the parsed data for debugging
                    logging.info(f"Parsed patient data: {triage_payload}")
                    
                    triage_url = str(fastapi_request.base_url) + "triage/"
                    is_pending_case = False
                    async with httpx.AsyncClient() as client:
                        triage_response = await client.post(triage_url, json=triage_payload, timeout=30)
                        triage_response.raise_for_status()
                        triage_data = triage_response.json()
                        if triage_data.get("status") == "Pending":
                            is_pending_case = True
                    
                    if is_pending_case:
                        final_user_message = "Thank you, all your emergency details have been recorded. All immediate local units are currently busy; your request has been placed in the highest priority queue, and a standby reserve unit has been alerted."
                    else:
                        final_user_message = "Thank you, all details have been recorded. Help is on the way."
                    llm_response_text = final_user_message
                    
                    # Add the final response to chat history before deleting session
                    chat_sessions[request.session_id].append({"role": "assistant", "content": llm_response_text})
                    
                    # Delete session after adding the final response
                    del chat_sessions[request.session_id]

            except (json.JSONDecodeError, AttributeError):
                # This is a regular chat message (or parsing failed), use the cleaned version
                llm_response_text = user_facing_message
        
        # Add the clean response to chat history (only if session still exists)
        if request.session_id in chat_sessions:
            chat_sessions[request.session_id].append({"role": "assistant", "content": llm_response_text})

        # --- TEXT-TO-SPEECH LOGIC ---
        clean_text = llm_response_text
        clean_text = ''.join(char for char in clean_text if ord(char) < 128)
        
        if not clean_text.strip():
            clean_text = "I can help with medical emergencies. Please describe the situation."
        
        if GTTS_AVAILABLE:
            try:
                audio_stream = io.BytesIO()
                tts = gTTS(text=clean_text, lang='en', tld='com.au')
                tts.write_to_fp(audio_stream)
                audio_stream.seek(0)
                
                return StreamingResponse(
                    audio_stream, media_type="audio/mpeg",
                    headers={
                        "Content-Disposition": "inline; filename=speech.mp3",
                        "X-LLM-Response-Text": quote(clean_text)
                    }
                )
            except Exception as e:
                logging.error(f"TTS generation failed: {str(e)}")
        
        return {"response": clean_text, "audio_available": False}
        
    except Exception as e:
        logging.error("Unexpected error in llm_chat:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
