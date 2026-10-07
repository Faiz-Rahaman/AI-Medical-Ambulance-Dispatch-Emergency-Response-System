import os
import logging
import json
from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, Tuple
import httpx
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..llm_config import (
    LOCAL_LLM_MODEL,
    LOCAL_LLM_URL,
    extract_llm_message_content,
    llm_request_options,
    reasoning_enabled,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import Google Maps for geocoding
try:
    import googlemaps
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
    if GOOGLE_MAPS_API_KEY:
        gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    else:
        gmaps = None
except ImportError:
    gmaps = None
    logger.warning("[WARN] googlemaps library not installed")
except Exception as e:
    gmaps = None
    logger.error(f"[ERR] Google Maps init error: {str(e)}")

router = APIRouter()

# VAPI Configuration
VAPI_API_KEY = os.getenv('VAPI_API_KEY')
VAPI_PHONE_NUMBER_ID = os.getenv('VAPI_PHONE_NUMBER_ID')

# Store call sessions for tracking
vapi_call_sessions: Dict[str, Dict[str, Any]] = {}


class VAPIStatusUpdate(BaseModel):
    """Model for VAPI status update webhooks"""
    message: Optional[Dict[str, Any]] = None
    call: Optional[Dict[str, Any]] = None
    type: Optional[str] = None


class VAPIFunctionCall(BaseModel):
    """Model for VAPI function call requests"""
    name: str
    parameters: Dict[str, Any]


class VAPIServerMessage(BaseModel):
    """Model for VAPI server message requests"""
    message: Optional[Dict[str, Any]] = None
    call: Optional[Dict[str, Any]] = None


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert an address string to latitude/longitude coordinates using Google Maps Geocoding API.
    Returns (latitude, longitude) tuple or None if geocoding fails.
    """
    if not gmaps or not address:
        return None
    
    try:
        geocode_result = gmaps.geocode(address)  # type: ignore[attr-defined]
        
        if geocode_result and len(geocode_result) > 0:
            location = geocode_result[0]['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            return (lat, lng)
        else:
            logger.warning(f"[WARN] Geocoding failed for: {address}")
            return None
    except Exception as e:
        logger.error(f"[ERR] Geocoding error: {str(e)}")
        return None


def extract_patient_data_from_transcript(transcript: str, call_id: str) -> Dict[str, Any]:
    """
    Extract patient data from conversation transcript.
    This will be called when VAPI detects that all patient information has been collected.
    """
    try:
        # Use the same LLM endpoint to extract structured data from transcript
        llm_url = LOCAL_LLM_URL
        
        extraction_prompt = f"""
        Extract patient information from this medical emergency conversation transcript.
        Return ONLY a JSON object with the following structure. Do not include any other text.

        {{
            "name": "patient name or empty string",
            "age": "numeric age only or 0",
            "gender": "Male, Female, or Other",
            "phone": "phone number or empty string",
            "symptoms": "description of symptoms"
        }}

        Transcript: {transcript}
        """
        
        payload = {
            "model": LOCAL_LLM_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a data extraction assistant. Extract patient information from medical conversations and return ONLY valid JSON."
                },
                {
                    "role": "user",
                    "content": extraction_prompt
                }
            ],
            "temperature": 0.0,
            "max_tokens": 300,
            **llm_request_options(),
        }
        # Use sync httpx client (fix: not in async function)
        with httpx.Client() as client:
            response = client.post(llm_url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            extracted_text = extract_llm_message_content(data)
        
        # Parse JSON from response
        extracted_json = json.loads(extracted_text)
        return extracted_json
        
    except Exception as e:
        logger.error(f"Error extracting patient data: {str(e)}")
        return {
            "name": "",
            "age": 0,
            "gender": "Other",
            "phone": "",
            "symptoms": transcript
        }


@router.post("/vapi/status")
async def handle_vapi_status(request: Request):
    """
    Handle VAPI status update webhooks.
    VAPI will send status updates when calls start, end, or change state.
    """
    try:
        try:
            body = await request.json()
        except Exception as json_error:
            logger.error(f"[ERR] Invalid JSON in status webhook: {str(json_error)}")
            return {"status": "error", "message": f"Invalid JSON format: {str(json_error)}"}
        
        # Extract call information
        call_data = body.get("call", {})
        call_id = call_data.get("id", "")
        call_status = call_data.get("status", "")
        call_from = call_data.get("from", "")
        call_to = call_data.get("to", "")
        
        # Store call session
        if call_id:
            if call_id not in vapi_call_sessions:
                vapi_call_sessions[call_id] = {
                    "call_id": call_id,
                    "from": call_from,
                    "to": call_to,
                    "status": call_status,
                    "transcript": [],
                    "patient_data": None
                }
            else:
                vapi_call_sessions[call_id]["status"] = call_status
        
        # Handle call ended - only create case if it wasn't created during the call
        if call_status == "ended" and call_id in vapi_call_sessions:
            session = vapi_call_sessions[call_id]
            
            # Check if case was already created during the call
            if session.get("case_id"):
                logger.info(f"[OK] Call ended - Case {session.get('case_id')} already created")
            else:
                # Case was not created during call - try to create from transcript as fallback
                logger.warning(f"[WARN] Call ended without case - attempting fallback")
                
                # Get full transcript if available
                transcript_text = " ".join(session.get("transcript", []))
                
                # If we have patient data, create case
                if session.get("patient_data") or transcript_text:
                    try:
                        # Extract patient data from transcript
                        patient_data = session.get("patient_data")
                        if not patient_data:
                            patient_data = extract_patient_data_from_transcript(transcript_text, call_id)
                        
                        # Create case via triage endpoint
                        if patient_data.get("name") and patient_data.get("age", 0) > 0:
                            # Extract and geocode location if available
                            location_text = patient_data.get("location", "").strip() or patient_data.get("address", "").strip()
                            latitude = None
                            longitude = None
                            location_display = "Location from voice call"
                            
                            if location_text:
                                coords = geocode_address(location_text)
                                if coords:
                                    latitude, longitude = coords
                                    location_display = location_text
                            
                            triage_payload = {
                                "name": patient_data.get("name", "").strip(),
                                "age": int(patient_data.get("age", 0)),
                                "gender": patient_data.get("gender", "Other"),
                                "contact": patient_data.get("phone", call_from),
                                "symptoms": patient_data.get("symptoms", transcript_text),
                                "location": location_display,
                                "latitude": latitude,
                                "longitude": longitude
                            }
                            
                            # Create case
                            triage_url = "http://localhost:8000/triage/"
                            async with httpx.AsyncClient() as client:
                                triage_response = await client.post(triage_url, json=triage_payload, timeout=30)
                                triage_response.raise_for_status()
                                case_data = triage_response.json()
                                session["case_id"] = case_data.get("id")
                                
                            logger.info(f"[OK] Case {case_data.get('id')} created (fallback)")
                        else:
                            logger.warning(f"[WARN] Insufficient patient data for fallback case")
                    
                    except Exception as e:
                        import traceback
                        error_trace = traceback.format_exc()
                        logger.error(f"[ERR] Error creating case from VAPI call {call_id}: {str(e)}\n{error_trace}")
                else:
                    logger.warning(f"[WARN] No patient data available for fallback")
        return {"status": "ok"}
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[ERR] Error handling VAPI status: {str(e)}\n{error_trace}")
        return {"status": "error", "message": str(e)}


@router.post("/vapi/function-call")
@router.post("/vapi/tool-calls")  # Also accept tool-calls endpoint (VAPI alias)
async def handle_vapi_function_call(request: Request):
    """
    Handle VAPI function call requests.
    This is called when VAPI needs to execute a function (like creating a case).
    """
    try:
        try:
            body = await request.json()
        except Exception as json_error:
            logger.error(f"[ERR] Invalid JSON in function call: {str(json_error)}")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=200,
                content={
                    "result": {
                        "success": False,
                        "message": f"Invalid JSON format: {str(json_error)}"
                    }
                }
            )
        
        call_data = body.get("call", {})
        call_id = call_data.get("id", "")
        
        # VAPI sends data in message.toolCalls format
        message = body.get("message", {})
        tool_calls = message.get("toolCalls", [])
        
        # Also check body directly for toolCalls
        if not tool_calls:
            tool_calls = body.get("toolCalls", [])
        
        function_name = ""
        parameters = {}
        tool_call_id = None
        
        # Extract from message.toolCalls format (VAPI's current format)
        if tool_calls and len(tool_calls) > 0:
            tool_call = tool_calls[0]
            tool_call_id = tool_call.get("id", "")
            function_obj = tool_call.get("function", {})
            
            if function_obj:
                function_name = function_obj.get("name", "")
                arguments = function_obj.get("arguments", {})
                if isinstance(arguments, str):
                    try:
                        parameters = json.loads(arguments)
                    except json.JSONDecodeError as e:
                        logger.error(f"[ERR] Failed to parse arguments: {str(e)}")
                        parameters = {}
                elif isinstance(arguments, dict):
                    parameters = arguments
        
        # Fallback: Try functionCall format (old format)
        if not function_name and body.get("functionCall"):
            function_call = body.get("functionCall", {})
            function_name = function_call.get("name", "")
            parameters = function_call.get("parameters", {})
            tool_call_id = body.get("toolCallId")
        
        # Fallback: Try toolWithToolCallList format
        if not function_name and message.get("toolWithToolCallList"):
            tool_with_call = message.get("toolWithToolCallList", [{}])[0]
            tool_call_obj = tool_with_call.get("toolCall", {})
            tool_call_id = tool_call_obj.get("id", "")
            function_obj = tool_call_obj.get("function", {})
            function_name = function_obj.get("name", "")
            arguments = function_obj.get("arguments", {})
            if isinstance(arguments, str):
                try:
                    parameters = json.loads(arguments)
                except:
                    parameters = {}
            else:
                parameters = arguments
        
        if not function_name:
            logger.error(f"[ERR] Could not extract function name from request")
            logger.error(f"   Body keys: {list(body.keys())}, Tool calls: {len(tool_calls) if tool_calls else 0}")
        
        if function_name:
            logger.info(f"📞 Function: {function_name} | Call: {call_id}")
        
        result = None
        
        if function_name == "create_emergency_case":
            # Create emergency case from collected patient data
            try:
                # Extract and validate parameters
                name = parameters.get("name", "").strip()
                age_str = str(parameters.get("age", "0")).strip()
                gender = parameters.get("gender", "Other").strip()
                phone = parameters.get("phone", "").strip() or call_data.get("from", "").strip()
                symptoms = parameters.get("symptoms", "").strip()
                
                # Validate required fields
                if not name:
                    raise ValueError("Patient name is required")
                
                try:
                    age = int(age_str) if age_str else 0
                    if age <= 0 or age > 150:
                        raise ValueError(f"Invalid age: {age}")
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid age format: {age_str}")
                
                if not symptoms:
                    symptoms = "Symptoms reported via phone call"
                
                # Normalize gender
                gender_lower = gender.lower()
                if gender_lower in ["male", "m", "man"]:
                    gender = "Male"
                elif gender_lower in ["female", "f", "woman"]:
                    gender = "Female"
                else:
                    gender = "Other"
                
                # Extract location from parameters
                location_text = parameters.get("location", "").strip() or parameters.get("address", "").strip()
                
                # Geocode location to get coordinates
                latitude = None
                longitude = None
                location_display = "Location from voice call"
                
                if location_text:
                    coords = geocode_address(location_text)
                    if coords:
                        latitude, longitude = coords
                        location_display = location_text
                    else:
                        location_display = location_text  # Still use the text even if geocoding fails
                
                # Prepare triage payload
                triage_payload = {
                    "name": name,
                    "age": age,
                    "gender": gender,
                    "contact": phone,
                    "symptoms": symptoms,
                    "location": location_display,
                    "latitude": latitude,
                    "longitude": longitude
                }
                
                # Create case via triage endpoint
                # Use HTTP request to call the triage endpoint
                # This ensures proper FastAPI dependency injection and validation
                triage_url = "http://localhost:8000/triage/"
                
                async with httpx.AsyncClient() as client:
                    try:
                        triage_response = await client.post(
                            triage_url, 
                            json=triage_payload, 
                            timeout=60.0,  # Increased timeout for LLM processing
                            headers={"Content-Type": "application/json"}
                        )
                        
                        if triage_response.status_code != 200:
                            error_text = triage_response.text
                            logger.error(f"[ERR] Triage endpoint error ({triage_response.status_code}): {error_text}")
                            raise HTTPException(
                                status_code=triage_response.status_code,
                                detail=f"Triage endpoint error: {error_text}"
                            )
                        
                        case_data = triage_response.json()
                        
                        # Verify case was created
                        if not case_data.get("id"):
                            raise ValueError("Case creation failed: No case ID returned")
                        
                    except httpx.TimeoutException:
                        logger.error("[ERR] Timeout waiting for triage endpoint")
                        raise HTTPException(
                            status_code=504,
                            detail="Triage endpoint timeout - case creation may still be in progress"
                        )
                    except httpx.RequestError as e:
                        logger.error(f"[ERR] Network error calling triage endpoint: {str(e)}")
                        raise HTTPException(
                            status_code=503,
                            detail=f"Unable to reach triage endpoint: {str(e)}"
                        )
                
                # Store in session
                if call_id:
                    if call_id not in vapi_call_sessions:
                        vapi_call_sessions[call_id] = {
                            "transcript": [],
                            "patient_data": None
                        }
                    vapi_call_sessions[call_id]["patient_data"] = parameters
                    vapi_call_sessions[call_id]["case_id"] = case_data.get("id")
                
                result = {
                    "success": True,
                    "message": "Emergency case created successfully. Help is on the way.",
                    "case_id": case_data.get("id")
                }
                
                logger.info(f"[OK] Case {case_data.get('id')} created: {name} ({age}) - {symptoms[:50]}...")
                
            except httpx.HTTPStatusError as e:
                error_detail = f"HTTP {e.response.status_code}: {e.response.text}"
                logger.error(f"[ERR] HTTP Error creating case: {error_detail}")
                result = {
                    "success": False,
                    "message": f"Error creating case: {error_detail}"
                }
            except ValueError as e:
                logger.error(f"[ERR] Validation Error: {str(e)}")
                result = {
                    "success": False,
                    "message": f"Validation error: {str(e)}"
                }
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                logger.error(f"[ERR] Error creating case via function call: {str(e)}\n{error_trace}")
                result = {
                    "success": False,
                    "message": f"Error creating case: {str(e)}"
                }
        
        else:
            logger.warning(f"[WARN] Unknown function: {function_name}")
            result = {
                "success": False,
                "message": f"Unknown function: {function_name}"
            }
        
        # Return response in VAPI format
        from fastapi.responses import JSONResponse
        
        if tool_call_id:
            response_content = {
                "results": [
                    {
                        "toolCallId": tool_call_id,
                        "result": result
                    }
                ]
            }
        else:
            response_content = {"result": result}
        return JSONResponse(
            status_code=200,
            content=response_content
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[ERR] Error handling VAPI function call: {str(e)}\n{error_trace}")
        
        # Always return a valid response, even on error
        from fastapi.responses import JSONResponse
        error_result = {
            "success": False,
            "message": str(e)
        }
        
        # Try to get toolCallId from the request (if body was already parsed above)
        # If we can't get it, use simple format
        response_content = {"result": error_result}
        
        return JSONResponse(
            status_code=200,  # Return 200 even on error so VAPI can process it
            content=response_content
        )


@router.post("/vapi/server")
async def handle_vapi_server(request: Request):
    """
    Handle VAPI server message requests.
    This allows dynamic responses based on call state.
    """
    try:
        body = await request.json()
        call_data = body.get("call", {})
        message_data = body.get("message", {})
        call_id = call_data.get("id", "")
        
        # Store transcript chunks
        if call_id and message_data.get("content"):
            if call_id not in vapi_call_sessions:
                vapi_call_sessions[call_id] = {"transcript": []}
            if "transcript" not in vapi_call_sessions[call_id]:
                vapi_call_sessions[call_id]["transcript"] = []
            
            # Add user messages to transcript
            if message_data.get("role") == "user":
                vapi_call_sessions[call_id]["transcript"].append(message_data.get("content", ""))
        
        return {}
        
    except Exception as e:
        logger.error(f"[ERR] VAPI server request error: {str(e)}")
        return {}


@router.post("/vapi/end-call")
async def handle_vapi_end_call(request: Request):
    """
    Handle VAPI end call webhooks.
    This is called when a call ends.
    """
    try:
        body = await request.json()
        
        call_data = body.get("call", {})
        call_id = call_data.get("id", "")
        
        # Process call data if needed
        if call_id in vapi_call_sessions:
            session = vapi_call_sessions[call_id]
            if session.get("case_id"):
                logger.info(f"[OK] Call ended - Case {session.get('case_id')} exists")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error handling VAPI end call: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/vapi/calls")
async def get_vapi_calls():
    """Get all active VAPI call sessions (for debugging)"""
    return {
        "active_sessions": len(vapi_call_sessions),
        "sessions": vapi_call_sessions
    }


@router.get("/vapi/config")
async def get_vapi_config():
    """Get VAPI configuration status"""
    return {
        "vapi_api_key_configured": bool(VAPI_API_KEY),
        "vapi_phone_number_id_configured": bool(VAPI_PHONE_NUMBER_ID),
        "active_sessions": len(vapi_call_sessions),
        "note": "VAPI uses OpenAI for conversations. Local LLM is used for triage analysis.",
        "local_llm_url": LOCAL_LLM_URL,
        "local_llm_model": LOCAL_LLM_MODEL,
        "local_llm_reasoning": "on" if reasoning_enabled() else "off",
        "webhook_endpoints": {
            "status": "/vapi/status",
            "function_call": "/vapi/function-call",
            "tool_calls": "/vapi/tool-calls",  # Added tool-calls endpoint
            "server": "/vapi/server",
            "end_call": "/vapi/end-call"
        },
        "available_routes": [
            "/vapi/status",
            "/vapi/function-call",
            "/vapi/tool-calls",
            "/vapi/server",
            "/vapi/end-call",
            "/vapi/config",
            "/vapi/calls",
            "/vapi/debug/recent-calls"
        ]
    }


@router.get("/vapi/debug/recent-calls")
async def get_recent_function_calls():
    """Debug endpoint to see recent function calls and their data"""
    recent_calls = []
    for call_id, session_data in list(vapi_call_sessions.items())[-10:]:  # Last 10 calls
        recent_calls.append({
            "call_id": call_id,
            "patient_data": session_data.get("patient_data"),
            "case_id": session_data.get("case_id"),
            "status": session_data.get("status"),
            "transcript": session_data.get("transcript", [])[-5:]  # Last 5 messages
        })
    
    return {
        "total_sessions": len(vapi_call_sessions),
        "recent_calls": recent_calls
    }


@router.post("/vapi/model")
async def handle_vapi_model_request(request: Request):
    """
    Custom model provider endpoint for VAPI.
    This endpoint proxies requests from VAPI to your local LLM.
    VAPI will call this endpoint instead of its default LLM.
    """
    try:
        body = await request.json()
        logger.info(f"VAPI Model Request: {json.dumps(body, indent=2)}")
        
        # Your local LLM endpoint (OpenAI-compatible format)
        llm_url = LOCAL_LLM_URL
        
        # Extract messages and model from VAPI request
        messages = body.get("messages", [])
        temperature = body.get("temperature", 0.7)
        max_tokens = body.get("max_tokens", 500)
        
        # Prepare payload for your LLM (OpenAI format)
        llm_payload = {
            "model": LOCAL_LLM_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **llm_request_options(),
        }
        
        # Forward request to your local LLM
        async with httpx.AsyncClient() as client:
            response = await client.post(llm_url, json=llm_payload, timeout=60)
            response.raise_for_status()
            llm_response = response.json()
        
        # Transform response to match VAPI's expected format
        # VAPI expects OpenAI-compatible response
        vapi_response = {
            "id": llm_response.get("id", "chatcmpl-default"),
            "object": "chat.completion",
            "created": llm_response.get("created", 0),
            "model": LOCAL_LLM_MODEL,
            "choices": llm_response.get("choices", []),
            "usage": llm_response.get("usage", {})
        }
        
        logger.info(f"[OK] LLM response forwarded to VAPI")
        return vapi_response
        
    except httpx.ConnectError:
        logger.error("[ERR] Local LLM not available at http://localhost:1234")
        raise HTTPException(
            status_code=503,
            detail="Local LLM service is not available. Make sure your LLM server is running on http://localhost:1234"
        )
    except Exception as e:
        logger.error(f"Error handling VAPI model request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing model request: {str(e)}")


@router.post("/vapi/initiate-call")
async def initiate_vapi_call(
    phone_number: str,
    assistant_id: Optional[str] = None
):
    """
    Initiate an outbound call using VAPI.
    Note: This requires VAPI API key and proper setup.
    """
    if not VAPI_API_KEY:
        raise HTTPException(status_code=400, detail="VAPI API key not configured")
    
    try:
        # VAPI API endpoint for creating calls
        vapi_url = "https://api.vapi.ai/call"
        
        headers = {
            "Authorization": f"Bearer {VAPI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "phoneNumberId": VAPI_PHONE_NUMBER_ID or assistant_id,
            "customer": {
                "number": phone_number
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(vapi_url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            call_data = response.json()
        
        logger.info(f"[OK] VAPI call initiated: {call_data}")
        return {
            "success": True,
            "call_id": call_data.get("id"),
            "status": call_data.get("status"),
            "message": "Call initiated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error initiating VAPI call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error initiating call: {str(e)}")

