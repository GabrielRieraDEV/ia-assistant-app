import React, { useEffect, useState } from 'react';

// Panel de gestión de usuarios: permite crear, editar y eliminar usuarios
export default function UserPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");
  const [editing, setEditing] = useState(null);
  const [username, setUsername] = useState("");

  // Cargar usuarios
    // Carga la lista de usuarios desde el backend
  const loadUsers = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:8000/admin/users')
      .then(res => res.json())
      .then(setUsers)
      .catch(() => setError("Error al cargar usuarios"))
      .finally(() => setLoading(false));
  };
  useEffect(loadUsers, []);

  // Crear usuario
    // Crea un nuevo usuario
  const createUser = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    fetch('http://localhost:8000/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        setInfo('Usuario creado');
        setUsername("");
        loadUsers();
        setTimeout(() => setInfo(''), 1500);
      })
      .catch(() => setError("Error al crear usuario (nombre único)"));
  };

  // Eliminar usuario
    // Elimina un usuario por ID
  const deleteUser = (id) => {
    if (!window.confirm('¿Eliminar usuario?')) return;
    fetch(`http://localhost:8000/admin/users/${id}`, { method: 'DELETE' })
      .then(() => {
        setInfo('Usuario eliminado');
        loadUsers();
        setTimeout(() => setInfo(''), 1500);
      })
      .catch(() => setError("Error al eliminar usuario"));
  };

  // Editar usuario
    // Inicia el modo de edición para un usuario
  const startEdit = (user) => {
    setEditing(user.id);
    setUsername(user.username);
  };
    // Cancela la edición de usuario
  const cancelEdit = () => {
    setEditing(null);
    setUsername("");
  };
    // Guarda los cambios de edición de usuario
  const saveEdit = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8000/admin/users/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        setInfo('Usuario actualizado');
        setEditing(null);
        setUsername("");
        loadUsers();
        setTimeout(() => setInfo(''), 1500);
      })
      .catch(() => setError("Error al actualizar usuario (nombre único)"));
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-lg font-bold mb-4 text-indigo-700">Gestión de Usuarios</h2>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {info && <div className="mb-2 text-green-600">{info}</div>}
      <form onSubmit={editing ? saveEdit : createUser} className="mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end w-full">
  <div className="flex-1 min-w-0">
    <label className="block text-xs text-gray-600">Nombre de usuario</label>
    <input className="border px-2 py-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400" 
      value={username} 
      onChange={e => setUsername(e.target.value)} 
      placeholder="Escribe un nombre..." />
  </div>
  <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 w-full sm:w-auto">
    {editing ? "Guardar" : "Crear"}
  </button>
  {editing && <button type="button" className="px-2 py-2 bg-gray-200 rounded text-xs ml-0 sm:ml-2 w-full sm:w-auto" onClick={cancelEdit}>Cancelar</button>}
</form>
      {loading ? <div className="text-gray-400">Cargando...</div> : (
        <ul className="divide-y border rounded bg-gray-50">
          {users.length === 0 && <li className="px-3 py-2 text-gray-400">No hay usuarios</li>}
          {users.map(user => (
            <li key={user.id} className="flex items-center justify-between px-3 py-2">
              <span className="flex-1">
                <span className="font-mono text-sm">#{user.id}</span> <span className="ml-2">{user.username}</span>
                <span className="ml-2 text-xs text-gray-500">{new Date(user.created_at).toLocaleString()}</span>
              </span>
              <span>
                <button className="text-xs text-blue-600 mr-2" onClick={() => startEdit(user)} title="Editar">✏️</button>
                <button className="text-xs text-red-600" onClick={() => deleteUser(user.id)} title="Eliminar">🗑</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
