import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, Edit3, Check, X, Eye, FolderPlus } from 'lucide-react';
import { getProducts, getCategories, createProduct, updateProduct, createCategory, subscribeToOrdersWebSocket } from '../services/api';

export default function ProductsManagement({ currentRole }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', category_id: '', price: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category_id: '', price: '' });
  const [msg, setMsg] = useState(null);

  const canEdit = ['ADMIN', 'GERENTE'].includes(currentRole);

  const loadData = async () => {
    try {
      const [prodsData, catsData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodsData);
      setCategories(catsData);
      if (catsData.length > 0) {
        setForm(f => ({ ...f, category_id: f.category_id || catsData[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToOrdersWebSocket((data) => {
      if (['PRODUCT_UPDATED', 'CATEGORIES_UPDATED'].includes(data.type)) {
        loadData();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);


  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
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
      setMsg({ type: 'success', text: `Producto "${created.name}" guardado con éxito` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al guardar producto' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!categoryForm.name.trim()) return;

    try {
      const created = await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      });
      setCategories(prev => [...prev, created]);
      setForm(f => ({ ...f, category_id: created.id }));
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      setMsg({ type: 'success', text: `Categoría "${created.name}" creada con éxito` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al crear categoría' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  const startEditing = (p) => {
    if (!canEdit) return;
    setEditingId(p.id);
    setEditForm({ name: p.name, category_id: p.category_id, price: p.price });
  };

  const saveEdit = async (id) => {
    if (!canEdit) return;
    try {
      const updated = await updateProduct(id, {
        name: editForm.name,
        category_id: editForm.category_id ? parseInt(editForm.category_id) : undefined,
        price: parseFloat(editForm.price),
      });
      setProducts(products.map(p => p.id === id ? updated : p));
      setEditingId(null);
      setMsg({ type: 'success', text: 'Producto actualizado con éxito' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al actualizar producto' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          msg.type === 'success' ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-rose-950/80 border-rose-700 text-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Sección de Gestión (Solo ADMIN y GERENTE) */}
      {canEdit && (
        <div className="space-y-6">
          {/* Crear Categoría Collapsible */}
          <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <FolderPlus className="text-emerald-400" /> Categorías ({categories.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {showCategoryForm ? <X className="w-4 h-4" /> : <FolderPlus className="w-4 h-4 text-emerald-400" />}
                {showCategoryForm ? 'Cancelar' : 'Nueva Categoría'}
              </button>
            </div>

            {showCategoryForm && (
              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre Categoría *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="ej: Bebidas"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="ej: Refrescos y cafés"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/30"
                  >
                    Guardar Categoría
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <span className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-lg">
                  No hay categorías creadas. ¡Crea una para añadir productos!
                </span>
              ) : (
                categories.map(cat => (
                  <span key={cat.id} className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-300">
                    {cat.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Crear Producto */}
          <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
              <PlusCircle className="text-emerald-400" /> Crear Producto
            </h3>

            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
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
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={categories.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/30"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catálogo de Productos */}
      <div className="bg-slate-800/80 border border-slate-700 backdrop-blur rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="text-amber-400" /> Catálogo de Productos
          </h3>
          {!canEdit && (
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Modo Solo Lectura
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => {
            const catName = categories.find(c => c.id === p.category_id)?.name || p.category?.name || 'Sin categoría';

            return (
              <div key={p.id} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
                {editingId === p.id && canEdit ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <select
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                      value={editForm.category_id}
                      onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
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
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400">
                          {catName}
                        </span>
                        {canEdit && (
                          <button onClick={() => startEditing(p)} className="text-slate-400 hover:text-amber-400 p-1 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-100 mt-2">{p.name}</h4>
                    </div>
                    <div className="mt-4 flex justify-between items-center border-t border-slate-800 pt-3">
                      <span className="text-lg font-bold text-emerald-400">{typeof p.price === 'number' ? p.price.toFixed(2) : p.price} €</span>
                      <span className="text-xs text-emerald-500 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">Disponible</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

