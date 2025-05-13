// Componente para mostrar un mensaje individual en el chat
import React from 'react';

/**
 * Renderiza un mensaje en el chat con estilos distintos según el rol del emisor.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.role - Rol del emisor del mensaje ('user' o 'ia').
 * @param {string} props.content - Contenido del mensaje.
 */
export default function Message({ role, content }) {
  // Renderiza el mensaje con estilos distintos según el rol
  return (
    <div className={role === 'user' ? 'text-right mb-2' : 'text-left mb-2'}>
      <span className={
        'inline-block px-3 py-2 rounded-lg ' +
        (role === 'user'
          ? 'bg-indigo-100 text-indigo-900'
          : 'bg-gray-200 text-gray-800')
      }>
        <b>{role === 'user' ? 'Tú' : 'IA'}:</b> {content}
      </span>
    </div>
  );
}
