import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';

export default function UsersManagement({ currentRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: '', password: '', role: 'WAITER' });
  const [msg, setMsg] = useState(null);

  const canManageUser = (targetUser) => {
    if (currentRole === 'ADMIN') return true;
    if (currentRole === 'GERENTE') {
      return targetUser.role === 'WAITER' || targetUser.role === 'KITCHEN';
    }
    return false;
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al cargar usuarios' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    
    try {
      const created = await createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        is_active: true
      });
      setUsers(prev => [...prev, created]);
      setForm({ username: '', password: '', role: 'WAITER' });
      setMsg({ type: 'success', text: `Usuario ${created.username} creado con éxito` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al crear usuario' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const toggleStatus = async (user) => {
    if (!canManageUser(user)) return;
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === user.id ? updated : u));
      setMsg({ type: 'success', text: `Estado de ${user.username} actualizado` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al actualizar estado' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const changeRole = async (user, newRole) => {
    if (!canManageUser(user)) return;
    try {
      const updated = await updateUser(user.id, { role: newRole });
      setUsers(users.map(u => u.id === user.id ? updated : u));
      setMsg({ type: 'success', text: `Rol de ${user.username} actualizado a ${newRole}` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al cambiar rol' });
      loadUsers();
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const handleDelete = async (user) => {
    if (!canManageUser(user)) return;
    if (!window.confirm(`¿Seguro que deseas eliminar al usuario ${user.username}?`)) return;
    try {
      await deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      setMsg({ type: 'success', text: `Usuario ${user.username} eliminado` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al eliminar usuario' });
    }
    setTimeout(() => setMsg(null), 4000);
  };


  return (
    <div className="space-y-8">
      {/* Formulario de Creación */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <UserPlus className="text-emerald-400" /> Crear Nuevo Usuario
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre de Usuario</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="ej: carlos_mozo"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Rol</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {currentRole === 'ADMIN' && (
                <>
                  <option value="ADMIN">ADMIN</option>
                  <option value="GERENTE">GERENTE (Manager)</option>
                </>
              )}
              <option value="WAITER">WAITER (Camarero)</option>
              <option value="KITCHEN">KITCHEN (Cocina)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Shield className="text-blue-400" /> Lista de Usuarios y Permisos
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-sm">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.map((u) => {
                const canManage = canManageUser(u);
                return (
                  <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">{u.username}</td>
                    <td className="py-3 px-4">
                      {canManage ? (
                        <select
                          className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200"
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value)}
                        >
                          {currentRole === 'ADMIN' && (
                            <>
                              <option value="ADMIN">ADMIN</option>
                              <option value="GERENTE">GERENTE (Manager)</option>
                            </>
                          )}
                          <option value="WAITER">WAITER (Camarero)</option>
                          <option value="KITCHEN">KITCHEN (Cocina)</option>
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-slate-900 text-slate-400 border border-slate-700 rounded">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-rose-900/60 border border-rose-500/50 text-rose-300 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      {canManage ? (
                        <>
                          <button
                            onClick={() => toggleStatus(u)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                              u.is_active
                                ? 'bg-amber-900/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/70'
                                : 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/70'
                            }`}
                          >
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-600/50 bg-rose-900/40 text-rose-300 hover:bg-rose-900/70 font-medium transition-colors flex items-center gap-1"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin permisos</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Informativo Flotante (Abajo a la Derecha) */}
      {msg && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur border text-sm font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}>
            {msg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
