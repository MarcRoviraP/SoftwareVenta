import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, Edit3, Check, X } from 'lucide-react';
import { getProducts, getCategories, createProduct } from '../services/api';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', category_id: '', price: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category_id: '', price: '' });
  const [msg, setMsg] = useState(null);

  const loadData = async () => {
    try {
      const [prodsData, catsData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodsData);
      setCategories(catsData);
      if (catsData.length > 0) {
        setForm(f => ({ ...f, category_id: catsData[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category_id) return;
    
    try {
      const created = await createProduct({
        name: form.name,
        category_id: parseInt(form.category_id),
        price: parseFloat(form.price),
        is_active: true,
      });
      setProducts(prev => [...prev, created]);
      setForm({ name: '', category_id: categories[0]?.id || '', price: '' });
      setMsg({ type: 'success', text: `Producto ${created.name} guardado con éxito` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al guardar producto' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const startEditing = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, category_id: p.category_id, price: p.price });
  };

  const saveEdit = (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...editForm, price: parseFloat(editForm.price) } : p));
    setEditingId(null);
  };


  return (
    <div className="space-y-8">
      {/* Crear Producto */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <PlusCircle className="text-emerald-400" /> Crear Producto
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre del Producto</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="ej: Ensalada César"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Categoría</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Precio (€)</label>
            <input
              type="number"
              step="0.5"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
            >
              Guardar Producto
            </button>
          </div>
        </form>
      </div>

      {/* Catálogo y Edición */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Package className="text-amber-400" /> Catálogo de Productos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => saveEdit(p.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
                        {p.category}
                      </span>
                      <button onClick={() => startEditing(p)} className="text-slate-400 hover:text-amber-400 p-1 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-slate-100 mt-2">{p.name}</h4>
                  </div>
                  <div className="mt-4 flex justify-between items-center border-t border-slate-800 pt-3">
                    <span className="text-lg font-bold text-emerald-400">{p.price.toFixed(2)} €</span>
                    <span className="text-xs text-emerald-500 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Disponible</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
