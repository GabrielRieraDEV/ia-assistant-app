from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import SQLModel, Field, Session, create_engine, select
from datetime import datetime
import re
import os
import requests
from dotenv import load_dotenv

# --- Configuración principal de la API ---
app = FastAPI(title="Asistente IA - Backend")

# Cargar variables de entorno desde .env
load_dotenv()
def llama2_response(prompt):
    """
    Llama al modelo DeepSeek-Prover-V2-671B usando huggingface_hub.InferenceClient con provider='novita'.
    Devuelve la respuesta generada por el modelo o un mensaje de error.
    """
    import os
    from huggingface_hub import InferenceClient
    from dotenv import load_dotenv
    load_dotenv(override=True)
    api_key = os.getenv("LLAMA2_API_KEY")
    client = InferenceClient(provider="novita", api_key=api_key)
    try:
        completion = client.chat.completions.create(
            model="deepseek-ai/DeepSeek-Prover-V2-671B",
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"[Error llamando al modelo DeepSeek-Prover-V2-671B: {e}]"

# Permitir CORS para desarrollo local (frontend y backend en distintos puertos)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de base de datos ---
# Modelo de usuario para la base de datos
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Modelo de conversación para la base de datos
class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Modelo de mensaje para la base de datos
class MessageDB(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- Modelos para administración ---
# --- Modelos de salida y entrada para la API ---
class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

class UserCreate(BaseModel):
    username: str

class UserUpdate(BaseModel):
    username: str

class ConversationOut(BaseModel):
    id: int
    created_at: datetime

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    timestamp: datetime

# --- Configuración de la base de datos ---
sqlite_url = "sqlite:///./db.sqlite3"
engine = create_engine(sqlite_url, echo=False)

# Crear tablas si no existen
def init_db():
    SQLModel.metadata.create_all(engine)

init_db()

# Provee una sesión de base de datos para cada request
def get_session():
    with Session(engine) as session:
        yield session

# --- Modelos para el endpoint de chat ---
class Message(BaseModel):
    role: str  # 'user' o 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

class ChatResponse(BaseModel):
    response: str
    tasks: List[str] = []

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest, session: Session = Depends(get_session)):
    """
    Endpoint principal de chat. Guarda mensajes, maneja comandos especiales y simula IA.
    Implementa control de contexto: solo se envían los últimos N mensajes relevantes al modelo IA.
    Si el historial es muy largo, se incluye un resumen simple del historial anterior.
    """
    CONTEXT_WINDOW = 10  # Número máximo de mensajes recientes a enviar al modelo

    # Buscar o crear conversación
    conversation_id = None
    if hasattr(payload, 'conversation_id') and payload.conversation_id:
        conversation_id = payload.conversation_id
        conv = session.get(Conversation, conversation_id)
        if not conv:
            conv = Conversation()
            session.add(conv)
            session.commit()
            conversation_id = conv.id
    else:
        conv = Conversation()
        session.add(conv)
        session.commit()
        conversation_id = conv.id

    # Guardar mensajes en la DB
    for msg in payload.messages:
        session.add(MessageDB(conversation_id=conversation_id, role=msg.role, content=msg.content))
    session.commit()

    last_msg = payload.messages[-1].content.strip()

    # --- Control de contexto: limitar el historial enviado al modelo IA ---
    # Recuperar todos los mensajes de la conversación
    msgs_db = session.exec(select(MessageDB).where(MessageDB.conversation_id==conversation_id).order_by(MessageDB.timestamp)).all()
    # Separar mensajes en roles
    history = [{"role": m.role, "content": m.content} for m in msgs_db]

    # Si hay más de CONTEXT_WINDOW mensajes, resumir los anteriores
    if len(history) > CONTEXT_WINDOW:
        # Mensajes a resumir
        old_msgs = history[:-CONTEXT_WINDOW]
        recent_msgs = history[-CONTEXT_WINDOW:]
        # Crear un resumen simple (puedes mejorar este algoritmo)
        resumen = " ".join([m["content"] for m in old_msgs if m["role"] == "user"])[:300]
        resumen_msg = {"role": "system", "content": f"Resumen del historial anterior: {resumen}"}
        context_for_model = [resumen_msg] + recent_msgs
    else:
        context_for_model = history

    # --- Comandos especiales ---
    if last_msg.startswith("/resumen"):
        # Resumir la conversación completa
        resumen = "\n".join([f"{m['role']}: {m['content']}" for m in history])
        response = f"Resumen de la conversación:\n{resumen}"
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response)
    elif last_msg.startswith("/traducir"):
        # Traducir dummy (simulación)
        traducido = last_msg.replace("/traducir", "(traducción simulada)")
        response = f"Traducción: {traducido}"
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response)
    elif last_msg.startswith("/buscar"):
        # --- Simulación de búsqueda web dummy ---
        termino = last_msg.replace("/buscar", "").strip()
        # Resultados simulados
        resultados = [
            f"Resultado 1 para '{termino}': https://ejemplo.com/1",
            f"Resultado 2 para '{termino}': https://ejemplo.com/2",
            f"Resultado 3 para '{termino}': https://ejemplo.com/3"
        ]
        response = f"Resultados simulados para '{termino}':\n" + "\n".join(resultados)
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response)
    elif "tarea" in last_msg.lower() or "recuérdame" in last_msg.lower() or "comprar" in last_msg.lower():
        tasks = [t.strip() for t in last_msg.replace("recuérdame", "").split("y")]
        response = "He generado una lista de tareas para ti."
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response, tasks=tasks)
    elif "buscar" in last_msg.lower():
        response = "Simulando búsqueda web: Resultado dummy encontrado."
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response)
    else:
        llama2_result = llama2_response(last_msg)
        if llama2_result:
            response = llama2_result
        else:
            response = "Respuesta generada por IA (dummy). Pregunta recibida: " + last_msg
        session.add(MessageDB(conversation_id=conversation_id, role="assistant", content=response))
        session.commit()
        return ChatResponse(response=response)

@app.get("/")
def root():
    """Endpoint raíz para verificar que el backend está funcionando."""
    return {"message": "Backend del asistente IA funcionando."}

# --- Endpoints de administración (CRUD) ---

# --- CRUD de usuarios ---
from fastapi import HTTPException

@app.get("/admin/users", response_model=List[UserOut])
def admin_list_users(session: Session = Depends(get_session)):
    """Devuelve la lista de usuarios."""
    return session.exec(select(User).order_by(User.created_at.desc())).all()

@app.post("/admin/users", response_model=UserOut)
def admin_create_user(user: UserCreate, session: Session = Depends(get_session)):
    """Crea un nuevo usuario (username único)."""
    if session.exec(select(User).where(User.username==user.username)).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    u = User(username=user.username)
    session.add(u)
    session.commit()
    session.refresh(u)
    return u

@app.put("/admin/users/{user_id}", response_model=UserOut)
def admin_update_user(user_id: int, data: UserUpdate, session: Session = Depends(get_session)):
    """Actualiza el nombre de usuario de un usuario existente."""
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if data.username:
        u.username = data.username
    session.add(u)
    session.commit()
    session.refresh(u)
    return u

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, session: Session = Depends(get_session)):
    """Elimina un usuario por ID."""
    u = session.get(User, user_id)
    if not u:
        return {"deleted": False}
    session.delete(u)
    session.commit()
    return {"deleted": True}

@app.get("/admin/conversations", response_model=List[ConversationOut])
def admin_list_conversations(session: Session = Depends(get_session)):
    """Devuelve la lista de conversaciones."""
    return session.exec(select(Conversation).order_by(Conversation.created_at.desc())).all()

@app.get("/admin/conversations/{conversation_id}", response_model=ConversationOut)
def admin_get_conversation(conversation_id: int, session: Session = Depends(get_session)):
    """Devuelve una conversación por ID."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        return {"error": "No existe"}
    return conv

@app.delete("/admin/conversations/{conversation_id}")
def admin_delete_conversation(conversation_id: int, session: Session = Depends(get_session)):
    """Elimina una conversación y todos sus mensajes asociados."""
    conv = session.get(Conversation, conversation_id)
    if not conv:
        return {"deleted": False}
    # Eliminar todos los mensajes asociados primero
    msgs = session.exec(select(MessageDB).where(MessageDB.conversation_id==conversation_id)).all()
    for msg in msgs:
        session.delete(msg)
    session.delete(conv)
    session.commit()
    return {"deleted": True}

@app.delete("/conversation/reset/{conversation_id}")
def reset_conversation(conversation_id: int, session: Session = Depends(get_session)):
    """
    Borra la conversación y todos sus mensajes dados un conversation_id.
    (Endpoint auxiliar para limpieza rápida)
    """
    conv = session.get(Conversation, conversation_id)
    if not conv:
        return {"reset": False}
    msgs = session.exec(select(MessageDB).where(MessageDB.conversation_id==conversation_id)).all()
    for msg in msgs:
        session.delete(msg)
    session.delete(conv)
    session.commit()
    return {"reset": True}

@app.get("/admin/messages/{conversation_id}", response_model=List[MessageOut])
def admin_list_messages(conversation_id: int, session: Session = Depends(get_session)):
    """Devuelve todos los mensajes de una conversación."""
    msgs = session.exec(select(MessageDB).where(MessageDB.conversation_id==conversation_id).order_by(MessageDB.timestamp)).all()
    return msgs

@app.delete("/admin/messages/{message_id}")
def admin_delete_message(message_id: int, session: Session = Depends(get_session)):
    """Elimina un mensaje individual por ID."""
    msg = session.get(MessageDB, message_id)
    if not msg:
        return {"deleted": False}
    session.delete(msg)
    session.commit()
    return {"deleted": True}

@app.get("/history/{conversation_id}")
def get_history(conversation_id: int, session: Session = Depends(get_session)):
    """Devuelve el historial de mensajes de una conversación (formato simple)."""
    msgs = session.exec(select(MessageDB).where(MessageDB.conversation_id==conversation_id).order_by(MessageDB.timestamp)).all()
    return [
        {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()} for m in msgs
    ]
