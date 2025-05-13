// Importaciones principales para el chat y el componente de mensaje
import React, { useState, useRef, useEffect } from 'react';
import Message from './Message';

// Componente principal de chat: muestra mensajes y permite enviar nuevos
export default function Chat({ messages, onSend, onReset }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

    // Hace scroll automático al último mensaje cuando cambian los mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

    // Maneja el envío del formulario de chat
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

    // Renderizado del chat: lista de mensajes, comandos rápidos y formulario de entrada
  return (
    <div>
      <div className="h-80 overflow-y-auto border rounded-md bg-gray-50 p-3 mb-4">
        {messages.map((msg, idx) => (
          <Message key={idx} role={msg.role} content={msg.content} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mb-2">
        {/* Botones de comandos rápidos */}
        <button type="button" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={() => setInput('/resumen')}>/resumen</button>
        <button type="button" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={() => setInput('/tareas\n- Comprar leche\n- Pagar la luz')}>/tareas</button>
        <button type="button" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={() => setInput('/traducir Hello, how are you?')}>/traducir</button>
        <button type="button" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={() => setInput('/buscar ')}>/buscar</button>
      </div>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Escribe tu mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >Enviar</button>
        <button
          type="button"
          className="bg-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-400 ml-2"
          onClick={onReset}
        >Reiniciar</button>
      </form>
    </div>
  );
}
