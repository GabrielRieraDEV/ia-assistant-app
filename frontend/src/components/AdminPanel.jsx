import React, { useEffect, useState } from 'react';
import UserPanel from './UserPanel';

// Panel de administración: gestiona usuarios, conversaciones y mensajes
export default function AdminPanel() {

  const [convs, setConvs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");

  // Cargar conversaciones
  useEffect(() => {
    setLoadingConvs(true);
    setError(null);
    fetch('http://localhost:8000/admin/conversations')
      .then(res => res.json())
      .then(async data => {
        // Para cada conversación, obtener el número de mensajes (opcional: optimizar con backend)
        const convsWithMsgCount = await Promise.all(
          data.map(async conv => {
            try {
              const res = await fetch(`http://localhost:8000/admin/messages/${conv.id}`);
              const msgs = await res.json();
              return { ...conv, msgCount: msgs.length };
            } catch {
              return { ...conv, msgCount: 0 };
            }
          })
        );
        setConvs(convsWithMsgCount);
        setLoadingConvs(false);
      })
      .catch(() => { setError("Error al cargar conversaciones"); setLoadingConvs(false); });
  }, [refresh]);

  // Seleccionar conversación
    // Selecciona una conversación y carga sus mensajes
  const selectConv = (id) => {
    setSelected(id);
    setLoadingMsgs(true);
    setError(null);
    fetch(`http://localhost:8000/admin/messages/${id}`)
      .then(res => res.json())
      .then(setMessages)
      .catch(() => setError("Error al cargar mensajes"))
      .finally(() => setLoadingMsgs(false));
  };

  // Eliminar conversación
    // Elimina una conversación y todos sus mensajes asociados
  const deleteConv = (id) => {
  if (!window.confirm('¿Eliminar conversación y todos sus mensajes?')) return;
  fetch(`http://localhost:8000/admin/conversations/${id}`, { method: 'DELETE' })
    .then(async res => {
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      console.log('DELETE /admin/conversations/', id, 'Status:', res.status, 'Response:', data);
      if (res.ok && data && data.deleted) {
        setSelected(null);
        setMessages([]);
        setRefresh(r => r+1);
        setInfo('¡Conversación eliminada correctamente!');
        setTimeout(() => setInfo(''), 2000);
      } else {
        setError("No se pudo eliminar la conversación");
      }
    })
    .catch((err) => { console.error('Error eliminando conversación:', err); setError("Error al eliminar conversación") });
};

  // Eliminar mensaje
    // Elimina un mensaje individual
  const deleteMsg = (id) => {
  if (!window.confirm('¿Eliminar mensaje?')) return;
  fetch(`http://localhost:8000/admin/messages/${id}`, { method: 'DELETE' })
    .then(async res => {
      let data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      console.log('DELETE /admin/messages/', id, 'Status:', res.status, 'Response:', data);
      if (res.ok && data && data.deleted) {
        if (selected) {
          fetch(`http://localhost:8000/admin/messages/${selected}`)
            .then(res => res.json())
            .then(setMessages);
        }
        setInfo('¡Mensaje eliminado correctamente!');
        setTimeout(() => setInfo(''), 2000);
      } else {
        setError("No se pudo eliminar el mensaje");
      }
    })
    .catch((err) => { console.error('Error eliminando mensaje:', err); setError("Error al eliminar mensaje") });
};

  // Recargar conversaciones
    // Fuerza la recarga de la lista de conversaciones
  const reloadConvs = () => setRefresh(r => r + 1);

  return (
    <div className="p-4">
      
      <h2 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-4">
        Panel de Administración
        <button onClick={reloadConvs} className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200">Recargar</button>
      </h2>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
  <div className="w-full lg:w-1/3 mb-4 lg:mb-0">
    <UserPanel />
  </div>
  <div className="flex-1 w-full">
    {error && <div className="mb-2 text-red-600">{error}</div>}
    {info && <div className="mb-2 text-green-600 font-semibold bg-green-50 border border-green-200 rounded px-3 py-2">{info}</div>}

    <h3 className="font-semibold mb-2">Conversaciones</h3>
          {loadingConvs ? <div className="text-gray-400">Cargando...</div> : (
            <ul className="border rounded bg-gray-50 max-h-64 overflow-y-auto divide-y">
              {convs.length === 0 && <li className="px-3 py-2 text-gray-400">No hay conversaciones</li>}
              {convs.map(conv => (
                <li key={conv.id} className={`flex items-center justify-between px-3 py-2 hover:bg-indigo-50 ${selected===conv.id ? 'bg-indigo-100' : ''}`}>
                  <span onClick={() => selectConv(conv.id)} className="cursor-pointer flex-1">
                    <span className="font-mono text-sm">#{conv.id}</span> <span className="text-xs text-gray-500">{new Date(conv.created_at).toLocaleString()}</span>
                    <span className="ml-2 text-xs text-gray-600">({conv.msgCount} mensajes)</span>
                  </span>
                  <button className="text-xs text-red-600 ml-2" onClick={() => deleteConv(conv.id)} title="Eliminar conversación">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Mensajes</h3>
          {selected ? (
            loadingMsgs ? <div className="text-gray-400">Cargando...</div> : (
              <ul className="border rounded bg-gray-50 max-h-64 overflow-y-auto divide-y">
                {messages.length === 0 && <li className="px-3 py-2 text-gray-400">No hay mensajes</li>}
                {messages.map(msg => (
                  <li key={msg.id} className="flex items-center justify-between px-3 py-2">
                    <span><b className={msg.role === 'user' ? 'text-blue-700' : 'text-indigo-700'}>{msg.role}:</b> {msg.content}</span>
                    <button className="text-xs text-red-600 ml-2" onClick={() => deleteMsg(msg.id)} title="Eliminar mensaje">🗑</button>
                  </li>
                ))}
              </ul>
            )
          ) : <div className="text-gray-400">Selecciona una conversación</div>}
        </div>
      </div>
    </div>
  );
}
