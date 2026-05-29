#!/usr/bin/env python3
import os
import sys
import requests
from typing import List, Optional, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from the project root directory absolutely
base_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(base_dir, '.env')
load_dotenv(env_path)

app = FastAPI(title="AI-Powered Quiz Platform API")

# Configure CORS so our React frontend (running on port 5173 or other) can talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Pydantic Schemas for Requests & Responses
# ==========================================

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatChoiceContext(BaseModel):
    id: str
    choice_text: str
    is_correct: bool = False

class ChatRequest(BaseModel):
    question_id: str
    student_answer: Union[str, List[str]]
    is_correct: bool
    chat_history: List[ChatMessage]
    message: str # The new message from the student
    question_title: Optional[str] = None
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    choices: Optional[List[ChatChoiceContext]] = None


# ==========================================
# API Route Implementations
# ==========================================

@app.post("/api/chat")
def chat_with_ai(chat_req: ChatRequest):
    """
    AI Companion endpoints. Uses Llama 3.3 70B Versatile model via Groq API.
    The frontend sends the question context, student answer, and correct answers.
    """
    GROQ_API_KEY = os.getenv('GROQ_API_KEY')
    if not GROQ_API_KEY:
        # Fallback to demo prompt if no API Key provided, telling user to set up GROQ_API_KEY
        return {
            "response": "⚠️ **Groq API Key missing!** Please add your `GROQ_API_KEY=gsk_...` to the `.env` file to chat with the AI companion in real-time.\n\nHere is a local explanation: The question asks about python concepts. Make sure to check details in `component 1/load_data.py` or QTI xml files."
        }

    # Format options/choices list for the AI
    options_text = ""
    correct_options_list = []
    student_options_list = []

    question_title = chat_req.question_title or "Local practice question"
    question_text = chat_req.question_text or ""
    question_type = chat_req.question_type or "practice_question"
    choices = chat_req.choices or []

    for c in choices:
        status = "Correct Option" if c.is_correct else "Incorrect Option"
        options_text += f"- Choice ID [{c.id}]: \"{c.choice_text}\" ({status})\n"
        if c.is_correct:
            correct_options_list.append(f"\"{c.choice_text}\" (ID: {c.id})")

        if isinstance(chat_req.student_answer, list):
            if c.id in chat_req.student_answer:
                student_options_list.append(f"\"{c.choice_text}\" (ID: {c.id})")
        else:
            if c.id == chat_req.student_answer:
                student_options_list.append(f"\"{c.choice_text}\" (ID: {c.id})")
                
    # If student answer was text (fill-in-the-blank or essay)
    if not student_options_list:
        if isinstance(chat_req.student_answer, list):
            student_options_list = chat_req.student_answer
        else:
            student_options_list = [str(chat_req.student_answer)]
            
    correct_answer_text = ", ".join(correct_options_list)
    student_answer_text = ", ".join(student_options_list) if student_options_list else "[No answer submitted]"
    result_status = "CORRECT" if chat_req.is_correct else "INCORRECT"
    
    # SYSTEM PROMPT DESIGN
    SYSTEM_PROMPT = f"""You are a calm, practical teaching assistant helping a student review one quiz question.
Sound like a thoughtful human tutor in a live office-hours chat, not a generic AI explainer.

You have access to the context of a quiz question that the student has just answered:
- Question Title: {question_title}
- Question Type: {question_type}
- Question Prompt: {question_text}
- Answer Options:
{options_text}
- Correct Answer(s): {correct_answer_text}
- Student's Answer: {student_answer_text}
- Result: {result_status}

Teaching style:
1. Start with the student's situation, not a lecture. Example tone: "You were close here..." or "The key move is..."
2. Keep the first answer short: usually 2-4 brief paragraphs or a few bullets. Avoid long templates.
3. Explain the reasoning step by step only as far as needed. Do not repeat the entire question unless it helps.
4. Refer naturally to "your answer" and "the expected answer"; do not sound like a grading report.
5. If the student was wrong, explain the likely misconception without making it feel punitive.
6. If the student was right, reinforce the reasoning and point out the general rule they can reuse.
7. End with one useful next move: a quick check question, a similar mini-example, or an invitation to challenge the answer.

Formatting rules:
- Use Markdown only when it improves readability.
- Prefer short paragraphs and compact bullets over big headings.
- Avoid phrases like "Understanding the Correct Answer", "Why Your Answer Was Incorrect", "Key Takeaway", "As an AI", or "Let's delve".
- Use code blocks only for actual code. Never write raw HTML in code blocks.
- Preserve operators exactly, especially Python operators like **, ==, !=, <=, and >=.

When the student asks a follow-up:
- Answer their exact question first.
- If they challenge the answer, evaluate their reasoning fairly and acknowledge valid edge cases.
- If their message is vague, ask one clarifying question instead of dumping a full explanation.
"""

    # Compile messages list for Groq API
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    
    # Add history
    for msg in chat_req.chat_history:
        messages.append({"role": msg.role, "content": msg.content})
        
    # Append the new message
    messages.append({"role": "user", "content": chat_req.message})
    
    # Groq OpenAI API call
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"[-] Groq API error: {response.text}", file=sys.stderr)
            raise HTTPException(status_code=502, detail="Error communicating with Groq AI API")
            
        resp_data = response.json()
        ai_reply = resp_data["choices"][0]["message"]["content"]
        return {"response": ai_reply}
        
    except requests.exceptions.RequestException as e:
        print(f"[-] API connection timeout/exception: {e}", file=sys.stderr)
        raise HTTPException(status_code=503, detail="AI Companion service temporarily unavailable")


if __name__ == '__main__':
    import uvicorn
    # Run the server on localhost:8000
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
