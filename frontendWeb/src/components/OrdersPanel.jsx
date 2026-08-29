import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle2, Clock, Wifi, MessageSquare, ChefHat, Edit3, X, CreditCard } from 'lucide-react';
import { getProducts, getCategories, getOrders, createOrder, updateOrder, updateOrderStatus, deleteOrder, subscribeToOrdersWebSocket } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9999';

export default function OrdersPanel() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState(1);
  const [notes, setNotes] = useState('');
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [prods, cats, ords] = await Promise.all([
        getProducts(),
        getCategories(),
        getOrders()
      ]);
      setProducts(prods);
      setCategories(cats);
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
        } else if (wsData.type === 'ORDER_UPDATED' && wsData.data) {
          setOrders((prevOrders) => prevOrders.map(o => o.id === wsData.data.id ? wsData.data : o));
        } else if (wsData.type === 'ORDER_DELETED' && wsData.data) {
          setOrders((prevOrders) => prevOrders.filter(o => o.id !== wsData.data.id));
        } else if (['PRODUCT_UPDATED', 'CATEGORIES_UPDATED'].includes(wsData.type)) {
          Promise.all([getProducts(), getCategories()]).then(([prods, cats]) => {
            setProducts(prods);
            setCategories(cats);
          }).catch(console.error);
        }
      },
      () => setWsConnected(false)
    );

    return () => unsubscribe();
  }, []);

  const addToCart = (product) => {
    const numPrice = Number(product.price) || 0;
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: (Number(item.qty) || 1) + 1 } : item));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: numPrice, image_url: product.image_url, qty: 1 }]);
    }
  };

  const decreaseQty = (id) => {
    const existing = cart.find(item => item.id === id);
    if (!existing) return;
    if (existing.qty > 1) {
      setCart(cart.map(item => item.id === id ? { ...item, qty: item.qty - 1 } : item));
    } else {
      removeFromCart(id);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const startEditOrder = (order) => {
    setEditingOrderId(order.id);
    setTableNumber(order.table_number);
    setNotes(order.notes || '');

    const formattedCart = (order.items || []).map(item => {
      const prod = products.find(p => p.id === item.product_id);
      return {
        id: item.product_id,
        name: prod ? prod.name : `Producto #${item.product_id}`,
        price: Number(item.unit_price) || (prod ? Number(prod.price) : 0),
        image_url: prod ? prod.image_url : null,
        qty: item.quantity
      };
    });

    setCart(formattedCart);
    setMsg({ type: 'info', text: `Editando Pedido #${order.id}. Modifica los items y pulsa "Guardar Cambios".` });
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setCart([]);
    setNotes('');
    setMsg(null);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;

    try {
      if (editingOrderId) {
        // Actualizar pedido existente
        const orderPayload = {
          table_number: parseInt(tableNumber),
          notes: notes.trim(),
          items: cart.map(i => ({
            product_id: i.id,
            quantity: i.qty
          }))
        };

        const updated = await updateOrder(editingOrderId, orderPayload);
        setCart([]);
        setNotes('');
        setEditingOrderId(null);
        setMsg({ type: 'success', text: `¡Pedido #${updated.id} actualizado con éxito!` });
      } else {
        // Crear nuevo pedido
        const orderPayload = {
          table_number: parseInt(tableNumber),
          status: 'PENDING',
          notes: notes.trim(),
          items: cart.map(i => ({
            product_id: i.id,
            quantity: i.qty
          }))
        };

        const created = await createOrder(orderPayload);
        setCart([]);
        setNotes('');
        setMsg({ type: 'success', text: `¡Pedido #${created.id} registrado como Pendiente!` });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al procesar el pedido' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al actualizar el pedido' });
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`¿Estás seguro de que deseas cancelar el Pedido #${orderId}?`)) return;

    try {
      await deleteOrder(orderId);
      if (editingOrderId === orderId) {
        cancelEditing();
      }
      setMsg({ type: 'success', text: `Pedido #${orderId} cancelado correctamente.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al cancelar el pedido' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const getProductName = (productId) => {
    const p = products.find(prod => prod.id === productId);
    return p ? p.name : `Producto #${productId}`;
  };

  const calculateOrderTotal = (orderItems) => {
    if (!orderItems || !Array.isArray(orderItems)) return 0;
    return orderItems.reduce((sum, item) => sum + ((Number(item.unit_price) || 0) * (Number(item.quantity) || 1)), 0);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-950/80 border-amber-700 text-amber-300';
      case 'EN_COCINA':
      case 'PREPARING':
        return 'bg-blue-950/80 border-blue-700 text-blue-300';
      case 'PAGADO':
      case 'PAID':
      case 'DELIVERED':
      case 'READY':
        return 'bg-emerald-950/80 border-emerald-700 text-emerald-300';
      case 'CANCELLED':
        return 'bg-rose-950/80 border-rose-700 text-rose-300';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Pendiente';
      case 'EN_COCINA':
      case 'PREPARING': return 'En cocina';
      case 'PAGADO':
      case 'PAID': return 'Pagado';
      case 'CANCELLED': return 'Cancelado';
      case 'READY': return 'Listo';
      case 'DELIVERED': return 'Entregado';
      default: return status;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Tomar / Editar Pedido */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="text-emerald-400" />
              {editingOrderId ? `Editando Pedido #${editingOrderId}` : 'Crear Pedido / Comanda'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 font-medium">Mesa N°:</span>
              <input
                type="number"
                min="1"
                max="50"
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                value={tableNumber}
                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Filtro por Categorías */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedCategory === null
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                Todas las categorías
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Grid de Productos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 italic">
                No hay productos disponibles en esta categoría
              </div>
            ) : (
              filteredProducts.map((p) => {
                const imgUrl = p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${API_BASE_URL}${p.image_url}`) : null;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-slate-900 hover:bg-slate-700/60 border border-slate-700/80 rounded-xl p-3.5 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors text-sm truncate">{p.name}</h4>
                        <span className="text-xs font-bold text-emerald-400 block mt-0.5">{Number(p.price).toFixed(2)} €</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <span className="p-1 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
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
            <div className={`p-3 rounded-lg text-sm mb-4 ${
              msg.type === 'success' ? 'bg-emerald-900/50 border border-emerald-500 text-emerald-200' :
              msg.type === 'info' ? 'bg-blue-900/50 border border-blue-500 text-blue-200' :
              'bg-rose-900/50 border border-rose-500 text-rose-200'
            }`}>
              {msg.text}
            </div>
          )}

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">Sin pedidos registrados aún</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className={`bg-slate-900/80 border rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${
                  editingOrderId === o.id ? 'border-amber-500 bg-amber-950/10' : 'border-slate-700/60'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 text-sm">Pedido #{o.id} — Mesa #{o.table_number}</span>
                      <span className={`text-xs px-2 py-0.5 border rounded font-semibold ${getStatusBadgeClass(o.status)}`}>
                        {getStatusLabel(o.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {o.items ? o.items.map(i => `${i.quantity}x ${getProductName(i.product_id)}`).join(', ') : 'Sin items'}
                    </p>
                    {o.notes && (
                      <p className="text-xs text-amber-300/90 italic flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Nota: {o.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <span className="font-bold text-slate-200 text-base">
                      {calculateOrderTotal(o.items).toFixed(2)} €
                    </span>
                    
                    {/* Botones de acción según estado */}
                    <div className="flex items-center gap-1.5">
                      {o.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => startEditOrder(o)}
                            className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded text-xs transition-colors flex items-center gap-1"
                            title="Editar Pedido"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleCancelOrder(o.id)}
                            className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded text-xs transition-colors flex items-center gap-1"
                            title="Cancelar Pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancelar
                          </button>
                          <button
                            onClick={() => handleStatusChange(o.id, 'EN_COCINA')}
                            className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 rounded text-xs transition-colors flex items-center gap-1 font-semibold"
                            title="Enviar a Cocina"
                          >
                            <ChefHat className="w-3.5 h-3.5" /> Pasar a cocina
                          </button>
                        </>
                      )}
                      {(o.status === 'EN_COCINA' || o.status === 'PREPARING' || o.status === 'READY') && (
                        <button
                          onClick={() => handleStatusChange(o.id, 'PAGADO')}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 rounded text-xs transition-colors flex items-center gap-1 font-semibold"
                          title="Marcar como Pagado"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pagado
                        </button>
                      )}
                      {(o.status === 'PAGADO' || o.status === 'PAID') && (
                        <span className="text-xs px-2 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                        </span>
                      )}
                    </div>
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
          <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
            <h3 className="text-lg font-bold text-slate-100">
              {editingOrderId ? `Editando Pedido #${editingOrderId}` : `Resumen Mesa #${tableNumber}`}
            </h3>
            {editingOrderId && (
              <button
                onClick={cancelEditing}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No hay productos en el pedido</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => {
                const itemPrice = Number(item.price) || 0;
                const itemQty = Number(item.qty) || 1;
                return (
                  <div key={item.id} className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{item.name}</span>
                      <span className="text-xs text-slate-400">{itemPrice.toFixed(2)} € / ud</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900 overflow-hidden">
                        <button onClick={() => decreaseQty(item.id)} className="p-1 hover:bg-slate-800 text-slate-300 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-2 text-emerald-400">{itemQty}</span>
                        <button onClick={() => addToCart(item)} className="p-1 hover:bg-slate-800 text-slate-300 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 w-16 text-right">{(itemQty * itemPrice).toFixed(2)} €</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-rose-400 ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Campo de Observaciones / Notas */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Observaciones / Notas:
            </label>
            <input
              type="text"
              placeholder="Ej: Sin cebolla, extra hielo..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-400">Total:</span>
            <span className="text-xl font-bold text-emerald-400">
              {cart.reduce((acc, i) => acc + ((Number(i.price) || 0) * (Number(i.qty) || 1)), 0).toFixed(2)} €
            </span>
          </div>

          <button
            onClick={submitOrder}
            disabled={cart.length === 0}
            className={`w-full font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg ${
              editingOrderId
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            } disabled:opacity-50`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {editingOrderId ? 'Guardar Cambios del Pedido' : 'Enviar Pedido (Pendiente)'}
          </button>
        </div>
      </div>
    </div>
  );
}

