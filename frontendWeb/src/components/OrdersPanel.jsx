import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, CheckCircle2, Clock, Wifi } from 'lucide-react';
import { getProducts, getOrders, createOrder, subscribeToOrdersWebSocket } from '../services/api';

export default function OrdersPanel() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState(1);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prods, ords] = await Promise.all([getProducts(), getOrders()]);
      setProducts(prods);
      setOrders(ords.reverse()); // Recientes primero
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // WebSocket en tiempo real
    const unsubscribe = subscribeToOrdersWebSocket(
      (wsData) => {
        setWsConnected(true);
        if (wsData.type === 'NEW_ORDER' && wsData.data) {
          setOrders((prevOrders) => [wsData.data, ...prevOrders.filter(o => o.id !== wsData.data.id)]);
        }
      },
      () => setWsConnected(false)
    );

    return () => unsubscribe();
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;

    try {
      const orderPayload = {
        table_number: parseInt(tableNumber),
        status: 'PENDING',
        notes: '',
        items: cart.map(i => ({
          product_id: i.id,
          quantity: i.qty
        }))
      };

      const created = await createOrder(orderPayload);
      setCart([]);
      setMsg({ type: 'success', text: `¡Pedido #${created.id} enviado a cocina!` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al enviar el pedido' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const getProductName = (productId) => {
    const p = products.find(prod => prod.id === productId);
    return p ? p.name : `Producto #${productId}`;
  };

  const calculateOrderTotal = (orderItems) => {
    if (!orderItems) return 0;
    return orderItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0);
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Tomar Pedido */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="text-emerald-400" /> Crear Pedido / Comanda
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Mesa N°:</span>
              <input
                type="number"
                min="1"
                max="50"
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-100"
                value={tableNumber}
                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-slate-900 hover:bg-slate-700/60 border border-slate-700/80 rounded-xl p-4 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{p.name}</h4>
                  <span className="text-sm font-bold text-emerald-400">{p.price.toFixed(2)} €</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="p-1 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Histórico Reciente de Pedidos */}
        <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Clock className="text-amber-400" /> Pedidos Registrados
            </h3>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
              wsConnected ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <Wifi className="w-3.5 h-3.5" />
              {wsConnected ? 'WebSocket Vivo' : 'Conectando WS...'}
            </span>
          </div>

          {msg && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${msg.type === 'success' ? 'bg-emerald-900/50 border border-emerald-500 text-emerald-200' : 'bg-rose-900/50 border border-rose-500 text-rose-200'}`}>
              {msg.text}
            </div>
          )}

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">Sin pedidos registrados aún</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-400 text-sm">Pedido #{o.id} — Mesa #{o.table_number}</span>
                    <p className="text-xs text-slate-400 mt-1">
                      {o.items ? o.items.map(i => `${i.quantity}x ${getProductName(i.product_id)}`).join(', ') : 'Sin items'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-200 block">
                      {calculateOrderTotal(o.items).toFixed(2)} €
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-amber-950/60 border border-amber-800 text-amber-300 rounded">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Carrito de Pedido Activo */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl flex flex-col justify-between h-fit">
        <div>
          <h3 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-3 mb-4">
            Resumen Mesa #{tableNumber}
          </h3>

          {cart.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No hay productos en el pedido</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{item.name}</span>
                    <span className="text-xs text-slate-400">{item.qty} x {item.price.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-emerald-400">{(item.qty * item.price).toFixed(2)} €</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-400">Total:</span>
            <span className="text-xl font-bold text-emerald-400">
              {cart.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2)} €
            </span>
          </div>

          <button
            onClick={submitOrder}
            disabled={cart.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-5 h-5" /> Enviar Pedido a Cocina
          </button>
        </div>
      </div>
    </div>
  );
}
