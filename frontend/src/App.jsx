// Importaciones principales de React y componentes de la app
import React, { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';

// Utilidad simple para guardar y recuperar conversation_id en localStorage
// Utilidad para recuperar el conversation_id guardado en localStorage
function getConversationId() {
  return localStorage.getItem('conversation_id');
}
// Guarda el conversation_id en localStorage
function setConversationId(id) {
  localStorage.setItem('conversation_id', id);
}
// Elimina el conversation_id de localStorage
function clearConversationId() {
  localStorage.removeItem('conversation_id');
}

// Componente principal de la aplicación
export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [conversationId, setConvId] = useState(getConversationId());
  const [showAdmin, setShowAdmin] = useState(false);

  // Cargar historial si existe conversationId
    // Cargar historial desde el backend si existe conversationId
  useEffect(() => {
    if (conversationId) {
      fetch(`http://localhost:8000/history/${conversationId}`)
        .then(res => res.json())
        .then(hist => {
          if (hist.length > 0) {
            setMessages(hist.map(m => ({ role: m.role, content: m.content })));
            setShowWelcome(false);
          }
        })
        .catch(() => {});
    }
  }, [conversationId]);

    // Envía un mensaje del usuario y recibe respuesta del backend
  const handleSend = async (userMsg) => {
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    // Llamada al backend
    try {
      const payload = { messages: newMessages };
      if (conversationId) payload.conversation_id = Number(conversationId);
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      // Si el backend crea una nueva conversación, obtén el id
      if (data.conversation_id) {
        setConvId(data.conversation_id);
        setConversationId(data.conversation_id);
      } else if (!conversationId) {
        // Si no hay id, fuerza recarga la próxima vez
        setConvId(1);
        setConversationId(1);
      }
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      setShowWelcome(false);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Error de conexión con el backend.' }]);
    }
  };

    // Reinicia la conversación y limpia el estado
  const handleReset = async () => {
    if (conversationId) {
      try {
        await fetch(`http://localhost:8000/conversation/reset/${conversationId}`, { method: 'DELETE' });
      } catch (err) {
        // Opcional: podrías mostrar un error si falla el backend
      }
    }
    setMessages([
      { role: 'assistant', content: '¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte hoy?' }
    ]);
    setShowWelcome(true);
    setConvId(null);
    clearConversationId();
  };

    // Renderizado principal: muestra el chat o el panel de administración
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-white">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl p-6 mt-6 mb-6">
        <div className="flex justify-between mb-4">
          <button
            className="text-sm px-3 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
            onClick={() => setShowAdmin(a => !a)}
          >{showAdmin ? 'Volver al chat' : 'Panel de administración'}</button>
        </div>
        {showAdmin ? (
          <AdminPanel />
        ) : (
          <>
            {showWelcome && <Welcome />}
            <Chat messages={messages} onSend={handleSend} onReset={handleReset} />
          </>
        )}
      </div>
    </div>
  );
}
