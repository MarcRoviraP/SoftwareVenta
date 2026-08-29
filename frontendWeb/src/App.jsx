import React, { useState, useEffect } from 'react';
import UsersManagement from './components/UsersManagement';
import ProductsManagement from './components/ProductsManagement';
import OrdersPanel from './components/OrdersPanel';
import { LogOut, ShieldCheck, Users, Package, ShoppingBag, AlertCircle, Key, CheckCircle2 } from 'lucide-react';
import { login, getMe, updateMyPassword, subscribeToOrdersWebSocket } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // { id, username, role, is_active }
  const [activeTab, setActiveTab] = useState('orders'); // 'users' | 'products' | 'orders'
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ error: null, success: null, loading: false });

  useEffect(() => {
    // Verificar token guardado al iniciar
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const user = await getMe();
          setCurrentUser(user);
          setActiveTab(['ADMIN', 'GERENTE'].includes(user.role) ? 'users' : 'orders');
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkToken();
  }, []);

  useEffect(() => {
    const handleUnauthorized = (e) => {
      const detailMsg = e.detail === 'Inactive user' ? 'Tu usuario ha sido desactivado por un administrador.' : 'Sesión expirada.';
      alert(detailMsg);
      handleLogout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToOrdersWebSocket((data) => {
      if (data.type === 'USER_UPDATED' && String(data.user_id) === String(currentUser.id)) {
        if (!data.is_active) {
          alert('Tu usuario ha sido desactivado por un administrador.');
          handleLogout();
        } else if (data.role !== currentUser.role) {
          setCurrentUser(prev => ({ ...prev, role: data.role }));
        }
      } else if (data.type === 'USER_DELETED' && String(data.user_id) === String(currentUser.id)) {
        alert('Tu usuario ha sido eliminado por un administrador.');
        handleLogout();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.id]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginForm.username || !loginForm.password) {
      setErrorMsg('Ingresa usuario y contraseña');
      return;
    }

    try {
      await login(loginForm.username, loginForm.password);
      const user = await getMe();
      setCurrentUser(user);
      setActiveTab(['ADMIN', 'GERENTE'].includes(user.role) ? 'users' : 'orders');

      // Si inició sesión con la clave por defecto 'admin', sugerir actualización
      if (loginForm.password === 'admin') {
        setShowPasswordModal(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setShowPasswordModal(false);
  };

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setPasswordStatus({ error: 'La nueva contraseña debe tener al menos 4 caracteres.', success: null, loading: false });
      return;
    }

    setPasswordStatus({ error: null, success: null, loading: true });
    try {
      await updateMyPassword(newPassword);
      setPasswordStatus({ error: null, success: '¡Contraseña actualizada exitosamente!', loading: false });
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStatus({ error: null, success: null, loading: false });
      }, 1500);
    } catch (err) {
      setPasswordStatus({ error: err.message || 'Error al cambiar contraseña', success: null, loading: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando sistema...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              POS Software Venta
            </h1>
            <p className="text-sm text-slate-400">Acceso Autenticado con FastAPI</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-700/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="admin"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
              <input
                type="password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="admin"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-950"
            >
              Iniciar Sesión
            </button>

            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Acceso Administrador por defecto:</p>
              <p>• Usuario: <code className="text-emerald-400">admin</code> / Contraseña: <code className="text-emerald-400">admin</code></p>
              <p className="text-[11px] text-slate-500 italic mt-1">Nuevos usuarios deben ser creados por el Administrador o Gerente.</p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Modal para Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-950/80 border border-amber-700/60 rounded-xl text-amber-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Actualizar Contraseña</h3>
                <p className="text-xs text-slate-400">Cambia tu clave para mayor seguridad</p>
              </div>
            </div>

            {passwordStatus.error && (
              <div className="p-3 bg-rose-950/70 border border-rose-700/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordStatus.error}</span>
              </div>
            )}

            {passwordStatus.success && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordStatus.success}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
                  placeholder="Ingresa nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordStatus.loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-950"
                >
                  {passwordStatus.loading ? 'Guardando...' : 'Cambiar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navbar Top */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
                Software Venta
              </h1>
              <span className="text-xs text-slate-400">Panel Multirrol</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-sm font-semibold text-slate-200">{currentUser.username}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                currentUser.role === 'ADMIN' ? 'bg-purple-950 border border-purple-700 text-purple-300' :
                currentUser.role === 'GERENTE' ? 'bg-blue-950 border border-blue-700 text-blue-300' :
                currentUser.role === 'KITCHEN' ? 'bg-amber-950 border border-amber-700 text-amber-300' :
                'bg-emerald-950 border border-emerald-700 text-emerald-300'
              }`}>
                ROL: {currentUser.role}
              </span>
            </div>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cambiar Contraseña"
            >
              <Key className="w-5 h-5" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sub-Navegación filtrada por ROL */}
        <div className="flex gap-2 border-b border-slate-800 pb-4 mb-8">
          {['ADMIN', 'GERENTE'].includes(currentUser.role) && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'users'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" /> Usuarios
            </button>
          )}

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> Productos
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Hacer Pedidos
          </button>
        </div>

        {/* Vistas Renderizadas por Permisos */}
        {activeTab === 'users' && ['ADMIN', 'GERENTE'].includes(currentUser.role) && (
          <UsersManagement currentRole={currentUser.role} />
        )}

        {activeTab === 'products' && (
          <ProductsManagement currentRole={currentUser.role} />
        )}

        {activeTab === 'orders' && (
          <OrdersPanel />
        )}
      </main>
    </div>
  );
}
