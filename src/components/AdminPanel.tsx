import { useState, useEffect, Fragment } from 'react';
import { motion } from 'motion/react';
import { X, Save, Plus, Trash2, Edit2, Key, Info, RefreshCw, CheckCircle, Package, Truck, Sliders, LayoutDashboard, ClipboardList, ChevronDown, AlertTriangle, Search, Image as ImageIcon, DollarSign, Upload, FolderPlus } from 'lucide-react';
import { Product, ProductVariant, ShippingOption, StoreConfig, Order, OrderStatus } from '../types';
import { slugify, totalStock, productSizes } from '../lib/products';
import { getCategories } from '../lib/categories';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  config: StoreConfig;
  onSaveConfig: (updatedProducts: Product[], updatedConfig: StoreConfig) => Promise<boolean>;
}

export default function AdminPanel({
  isOpen,
  onClose,
  products,
  config,
  onSaveConfig,
}: AdminPanelProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'products' | 'orders' | 'shipping' | 'global'>('dashboard');

  // Dashboard + orders (server-backed, token-authenticated)
  const [stats, setStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Per-product inline editor + delete confirmation
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category creation + image upload
  const [newCatLabel, setNewCatLabel] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null); // 'new' | productId | null

  // Append a category to the store config (deduped). Returns the value to select.
  const addCategoryValue = (label: string): string => {
    const trimmed = label.trim();
    const value = slugify(trimmed);
    if (!value) return '';
    setLocalConfig((prev) => {
      const cats = getCategories(prev);
      if (cats.some((c) => c.value === value)) return prev;
      return { ...prev, categories: [...cats, { value, label: trimmed }] };
    });
    return value;
  };

  const uploadImageFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken()}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed.');
    return data.url as string;
  };

  const handleUploadForNew = async (file: File) => {
    setUploadingFor('new');
    try {
      const url = await uploadImageFile(file);
      setNewProduct((prev) => ({ ...prev, images: [...(prev.images || []), url] }));
      setStatusMsg({ type: 'success', text: 'Image uploaded.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Upload failed.' });
    } finally {
      setUploadingFor(null);
    }
  };

  const handleUploadForProduct = async (id: string, file: File) => {
    setUploadingFor(id);
    try {
      const url = await uploadImageFile(file);
      setLocalProducts((prev) => prev.map((p) => (p.id === id ? { ...p, images: [...p.images, url] } : p)));
      setStatusMsg({ type: 'success', text: 'Image uploaded — remember to Save.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Upload failed.' });
    } finally {
      setUploadingFor(null);
    }
  };

  const adminToken = () => localStorage.getItem('ta_admin_token') || '';
  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${adminToken()}` },
    });

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await authFetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch {
      /* non-fatal */
    } finally {
      setStatsLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res = await authFetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) setOrders(data.orders);
      else setOrdersError(data.message || 'Failed to load orders.');
    } catch {
      setOrdersError('Could not reach the orders service.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        loadStats();
      }
    } catch {
      /* ignore */
    } finally {
      setUpdatingOrderId(null);
    }
  };
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Reset verification states on close
  useEffect(() => {
    if (!isOpen) {
      setIsAuthenticated(false);
      setEmailInput('');
      setPasswordInput('');
      setLoginError('');
    }
  }, [isOpen]);

  // Load dashboard stats + orders once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('ta_admin_token', data.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError(data.message || 'Invalid admin email or password.');
      }
    } catch {
      setLoginError('Could not reach the authentication server.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Local state for modifications (deep copied)
  const [localProducts, setLocalProducts] = useState<Product[]>(JSON.parse(JSON.stringify(products)));
  const [localConfig, setLocalConfig] = useState<StoreConfig>(JSON.parse(JSON.stringify(config)));
  
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state for adding a new product
  const NEW_PRODUCT_DEFAULT: Partial<Product> = {
    name: '',
    category: 'kurta',
    price: 150,
    originalPrice: undefined,
    description: '',
    images: ['https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80'],
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cool inside out. Gentle tumble dry low.',
    status: 'active',
    isFeatured: false,
    badge: 'New Launch',
  };
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ ...NEW_PRODUCT_DEFAULT });
  // Helper inputs for building per-size variants on the new product
  const [newSizesInput, setNewSizesInput] = useState('M, L, XL, XXL');
  const [newStockPerSize, setNewStockPerSize] = useState(10);

  // Local state for adding a shipping option
  const [newShipping, setNewShipping] = useState<Partial<ShippingOption>>({
    name: '',
    price: 15,
    estimatedDays: '3-5 Business Days',
    description: '',
    isAvailable: true
  });

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03100e]/95 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#06211E] border border-[#E6B579]/20 w-full max-w-md p-6 sm:p-8 space-y-6 relative rounded-none shadow-2xl animate-fade-in"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 border-b border-[#E6B579]/20 pb-6">
            <Key className="w-12 h-12 text-[#E6B579] mx-auto animate-pulse" />
            <span className="font-display text-xl tracking-[0.2em] text-[#E6B579] font-bold block">
              TANVIR ATTIRE
            </span>
            <p className="text-[10px] tracking-widest text-[#E6B579]/70 uppercase font-mono">Atelier Security Verification</p>
            <p className="text-xs text-gray-400 font-sans font-light">Enter admin credentials to authorize dashboard modifications.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[9px] text-gray-400 uppercase tracking-wider mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@tanvirattire.com.au"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-[#03100e] border border-[#E6B579]/25 text-xs px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
              />
            </div>

            <div>
              <label className="block text-[9px] text-gray-400 uppercase tracking-wider mb-1">
                Security Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#03100e] border border-[#E6B579]/25 text-xs px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
              />
            </div>

            {loginError && (
              <p className="text-rose-400 text-[10px] font-mono bg-rose-950/20 border border-rose-500/20 p-2 text-center uppercase tracking-wider animate-pulse">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-[#E6B579] hover:bg-white text-[#06211E] text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 rounded-none cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? 'Verifying…' : 'Verify Credentials'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-[8px] text-gray-400 uppercase tracking-widest font-mono">
              Secured Melbourne Portal (Victoria, AU)
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle core submit/save over full-stack API
  const handleSaveAll = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const ok = await onSaveConfig(localProducts, localConfig);
      if (ok) {
        setStatusMsg({ type: 'success', text: 'Tanvir Attire configurations synchronized on server disk.' });
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ type: 'error', text: 'Storage error. Failed to persist settings.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Unresponsive server connection.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Product actions
  const handleProductPriceChange = (id: string, newPrice: number) => {
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, price: Number(newPrice) } : p));
  };

  const handleVariantStockChange = (id: string, size: string, stock: number) => {
    setLocalProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        variants: p.variants.map(v => v.size === size ? { ...v, stock: Math.max(0, Number(stock) || 0) } : v),
      };
    }));
  };

  const handleProductCycleStatus = (id: string) => {
    const order: Product['status'][] = ['active', 'draft', 'out_of_stock'];
    setLocalProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = order[(order.indexOf(p.status) + 1) % order.length];
      return { ...p, status: next };
    }));
  };

  const handleProductToggleFeatured = (id: string) => {
    setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p));
  };

  const handleDeleteProduct = (id: string) => {
    setLocalProducts(prev => prev.filter(p => p.id !== id));
    setDeleteConfirmId(null);
    if (editingProductId === id) setEditingProductId(null);
  };

  const updateProductField = (id: string, patch: Partial<Product>) => {
    setLocalProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addProductImage = (id: string) => {
    setLocalProducts(prev => prev.map(p => (p.id === id ? { ...p, images: [...p.images, ''] } : p)));
  };
  const updateProductImage = (id: string, idx: number, url: string) => {
    setLocalProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, images: p.images.map((im, i) => (i === idx ? url : im)) } : p))
    );
  };
  const removeProductImage = (id: string, idx: number) => {
    setLocalProducts(prev => prev.map(p => (p.id === id ? { ...p, images: p.images.filter((_, i) => i !== idx) } : p)));
  };

  const addVariant = (id: string) => {
    setLocalProducts(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        const sku = `${slugify(p.name).toUpperCase().slice(0, 12)}-NEW${p.variants.length + 1}`;
        return { ...p, variants: [...p.variants, { size: 'NEW', stock: 0, sku }] };
      })
    );
  };
  const updateVariant = (id: string, idx: number, patch: Partial<ProductVariant>) => {
    setLocalProducts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, variants: p.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) } : p
      )
    );
  };
  const removeVariant = (id: string, idx: number) => {
    setLocalProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, variants: p.variants.filter((_, i) => i !== idx) } : p))
    );
  };

  const handleAddProduct = () => {
    if (!newProduct.name?.trim()) {
      setStatusMsg({ type: 'error', text: 'Product name is required.' });
      return;
    }
    const sizes = newSizesInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (sizes.length === 0) {
      setStatusMsg({ type: 'error', text: 'Add at least one size (e.g. M, L, XL).' });
      return;
    }
    const id = 'prod_' + Date.now();
    const name = newProduct.name.trim();
    const slug = slugify(name);
    const variants: ProductVariant[] = sizes.map(size => ({
      size,
      stock: Math.max(0, Number(newStockPerSize) || 0),
      sku: `${slug.toUpperCase().slice(0, 12)}-${size}`,
    }));
    const itemToAdd: Product = {
      id,
      slug,
      name,
      category: (newProduct.category as Product['category']) || 'kurta',
      price: Number(newProduct.price) || 0,
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
      salePrice: newProduct.salePrice ? Number(newProduct.salePrice) : undefined,
      description: newProduct.description || '',
      images: newProduct.images && newProduct.images.length ? newProduct.images : [],
      variants,
      materials: newProduct.materials || [],
      careInstructions: newProduct.careInstructions || '',
      status: (newProduct.status as Product['status']) || 'active',
      isFeatured: !!newProduct.isFeatured,
      badge: newProduct.badge || undefined,
      sizeGuide: newProduct.category === 'kurta' ? 'panjabi-slimfit' : undefined,
    };
    setLocalProducts(prev => [itemToAdd, ...prev]);
    setNewProduct({ ...NEW_PRODUCT_DEFAULT });
    setNewSizesInput('M, L, XL, XXL');
    setNewStockPerSize(10);
    setStatusMsg({ type: 'success', text: `"${name}" added — remember to Sync with Server.` });
  };

  // Shipping actions
  const handleShippingPriceChange = (id: string, price: number) => {
    setLocalConfig(prev => {
      const updatedOpts = prev.shippingChargeOptions.map(opt => 
        opt.id === id ? { ...opt, price: Number(price) } : opt
      );
      return { ...prev, shippingChargeOptions: updatedOpts };
    });
  };

  const handleShippingFreeThresholdChange = (id: string, value: string) => {
    setLocalConfig(prev => {
      const updatedOpts = prev.shippingChargeOptions.map(opt => 
        opt.id === id ? { ...opt, freeAboveAmount: value ? Number(value) : undefined } : opt
      );
      return { ...prev, shippingChargeOptions: updatedOpts };
    });
  };

  const handleAddShippingOption = () => {
    if (!newShipping.name?.trim()) return;
    const itemToAdd: ShippingOption = {
      ...(newShipping as ShippingOption),
      id: 'sh_' + Date.now()
    };
    setLocalConfig(prev => ({
      ...prev,
      shippingChargeOptions: [...prev.shippingChargeOptions, itemToAdd]
    }));
    // Reset form
    setNewShipping({
      name: '',
      price: 15,
      estimatedDays: '3-5 Business Days',
      description: '',
      isAvailable: true
    });
  };

  const handleDeleteShippingOption = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      shippingChargeOptions: prev.shippingChargeOptions.filter(opt => opt.id !== id)
    }));
  };

  const editorLabel = 'text-[10px] text-gray-400 font-mono uppercase tracking-wider';
  const editorInput =
    'w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579]';

  // Category dropdown + inline "add new category" control (writes to store config).
  const renderCategoryControl = (value: string, setValue: (v: string) => void) => (
    <div className="space-y-1.5">
      <select className={editorInput} value={value} onChange={(e) => setValue(e.target.value)}>
        {getCategories(localConfig).map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
        {/* allow a value not yet in the list (e.g. legacy) to remain selectable */}
        {!getCategories(localConfig).some((c) => c.value === value) && value && (
          <option value={value}>{value}</option>
        )}
      </select>
      <div className="flex gap-1.5">
        <input
          className={editorInput}
          placeholder="New category name (e.g. Sherwani)"
          value={newCatLabel}
          onChange={(e) => setNewCatLabel(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            const v = addCategoryValue(newCatLabel);
            if (v) {
              setValue(v);
              setNewCatLabel('');
            }
          }}
          className="px-3 py-2 bg-[#E6B579]/10 hover:bg-[#E6B579] text-[#E6B579] hover:text-[#06211E] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );

  const renderProductEditor = (p: Product) => (
    <div className="space-y-5">
      {/* Core fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1 md:col-span-2">
          <label className={editorLabel}>Product Name</label>
          <input className={editorInput} value={p.name} onChange={(e) => updateProductField(p.id, { name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className={editorLabel}>Category</label>
          {renderCategoryControl(p.category, (v) => updateProductField(p.id, { category: v }))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className={editorLabel}>Price (AUD)</label>
          <input type="number" className={editorInput} value={p.price} onChange={(e) => updateProductField(p.id, { price: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <label className={editorLabel}>Sale Price</label>
          <input
            type="number"
            placeholder="none"
            className={editorInput}
            value={p.salePrice ?? ''}
            onChange={(e) => updateProductField(p.id, { salePrice: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-1">
          <label className={editorLabel}>Compare-at Price</label>
          <input
            type="number"
            placeholder="none"
            className={editorInput}
            value={p.originalPrice ?? ''}
            onChange={(e) => updateProductField(p.id, { originalPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-1">
          <label className={editorLabel}>Badge</label>
          <input className={editorInput} placeholder="e.g. Bestseller" value={p.badge ?? ''} onChange={(e) => updateProductField(p.id, { badge: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1">
        <label className={editorLabel}>Description</label>
        <textarea rows={2} className={`${editorInput} resize-none`} value={p.description} onChange={(e) => updateProductField(p.id, { description: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={editorLabel}>Materials (comma separated)</label>
          <input
            className={editorInput}
            value={p.materials.join(', ')}
            onChange={(e) => updateProductField(p.id, { materials: e.target.value.split(',').map((m) => m.trim()).filter(Boolean) })}
          />
        </div>
        <div className="space-y-1">
          <label className={editorLabel}>Care Instructions</label>
          <input className={editorInput} value={p.careInstructions} onChange={(e) => updateProductField(p.id, { careInstructions: e.target.value })} />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`${editorLabel} flex items-center gap-1.5`}><ImageIcon className="w-3.5 h-3.5" /> Images</label>
          <div className="flex items-center gap-3">
            <label className={`text-[9px] font-mono uppercase tracking-widest cursor-pointer flex items-center gap-1 ${uploadingFor === p.id ? 'text-gray-500' : 'text-[#E6B579] hover:text-white'}`}>
              {uploadingFor === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploadingFor === p.id ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingFor === p.id}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadForProduct(p.id, f); e.currentTarget.value = ''; }}
              />
            </label>
            <button onClick={() => addProductImage(p.id)} className="text-[9px] font-mono uppercase tracking-widest text-[#E6B579] hover:text-white flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add URL
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {p.images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-9 h-11 shrink-0 bg-[#06211E] border border-[#E6B579]/15 overflow-hidden">
                {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <input
                className={editorInput}
                placeholder="https://image-url"
                value={img}
                onChange={(e) => updateProductImage(p.id, idx, e.target.value)}
              />
              <button onClick={() => removeProductImage(p.id, idx)} className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/15 rounded shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {p.images.length === 0 && <p className="text-[10px] text-gray-600 font-mono">No images — add at least one.</p>}
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={editorLabel}>Sizes &amp; Variants (size · stock · SKU)</label>
          <button onClick={() => addVariant(p.id)} className="text-[9px] font-mono uppercase tracking-widest text-[#E6B579] hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add size
          </button>
        </div>
        <div className="space-y-2">
          {p.variants.map((v, idx) => (
            <div key={idx} className="grid grid-cols-[70px_80px_1fr_auto] gap-2 items-center">
              <input className={`${editorInput} text-center uppercase`} value={v.size} onChange={(e) => updateVariant(p.id, idx, { size: e.target.value.toUpperCase() })} />
              <input type="number" min={0} className={`${editorInput} text-center`} value={v.stock} onChange={(e) => updateVariant(p.id, idx, { stock: Math.max(0, Number(e.target.value) || 0) })} />
              <input className={editorInput} value={v.sku} onChange={(e) => updateVariant(p.id, idx, { sku: e.target.value })} />
              <button onClick={() => removeVariant(p.id, idx)} className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/15 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E6B579]/10">
        <div className="flex items-center gap-2">
          <span className={editorLabel}>Status:</span>
          <button onClick={() => handleProductCycleStatus(p.id)} className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border border-[#E6B579]/30 text-[#E6B579]">
            {p.status}
          </button>
          <button onClick={() => handleProductToggleFeatured(p.id)} className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border ${p.isFeatured ? 'border-amber-500/30 text-amber-500' : 'border-gray-700 text-gray-500'}`}>
            {p.isFeatured ? 'Featured' : 'Standard'}
          </button>
        </div>
        <button onClick={() => setEditingProductId(null)} className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest bg-[#E6B579] text-[#06211E] font-bold hover:bg-white">
          Done editing
        </button>
      </div>
      <p className="text-[9px] text-gray-500 font-mono">Changes apply when you click <strong>Save Changes</strong> below.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03100e]/95 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#06211E] border border-[#E6B579]/20 w-full max-w-5xl h-[88vh] flex flex-col justify-between shadow-2xl"
      >
        
        {/* Top bar header */}
        <div className="p-6 border-b border-[#E6B579]/10 flex items-center justify-between bg-[#03100e]">
          <div className="flex items-center space-x-3">
            <Sliders className="w-5 h-5 text-[#E6B579] animate-pulse" />
            <div>
              <span className="font-serif text-lg tracking-widest text-[#E6B579] block uppercase">
                TANVIR ATELIER MANAGEMENT
              </span>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                Melbourne Hub Retail Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              id="admin-close-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-[#E6B579]/15 rounded-full text-gray-400 hover:text-white transition-all uppercase text-xs flex items-center gap-1.5 font-mono"
            >
              <X className="w-4 h-4" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Tab Selection Area */}
        <div className="flex border-b border-[#E6B579]/10 bg-[#041917] overflow-x-auto">
          <button
            id="admin-tab-dashboard"
            onClick={() => setActiveAdminTab('dashboard')}
            className={`px-6 py-4 text-xs font-mono tracking-widest uppercase flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'dashboard'
                ? 'bg-[#06211E] text-[#E6B579] border-t-2 border-[#E6B579]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            id="admin-tab-products"
            onClick={() => setActiveAdminTab('products')}
            className={`px-6 py-4 text-xs font-mono tracking-widest uppercase flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'products'
                ? 'bg-[#06211E] text-[#E6B579] border-t-2 border-[#E6B579]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({localProducts.length})</span>
          </button>
          <button
            id="admin-tab-orders"
            onClick={() => { setActiveAdminTab('orders'); loadOrders(); }}
            className={`px-6 py-4 text-xs font-mono tracking-widest uppercase flex items-center gap-2 whitespace-nowrap ${
              activeAdminTab === 'orders'
                ? 'bg-[#06211E] text-[#E6B579] border-t-2 border-[#E6B579]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            id="admin-tab-shipping"
            onClick={() => setActiveAdminTab('shipping')}
            className={`px-6 py-4 text-xs font-mono tracking-widest uppercase flex items-center gap-2 ${
              activeAdminTab === 'shipping'
                ? 'bg-[#06211E] text-[#E6B579] border-t-2 border-[#E6B579]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Australian Shipping Option Matrix</span>
          </button>
          <button
            id="admin-tab-global"
            onClick={() => setActiveAdminTab('global')}
            className={`px-6 py-4 text-xs font-mono tracking-widest uppercase flex items-center gap-2 ${
              activeAdminTab === 'global'
                ? 'bg-[#06211E] text-[#E6B579] border-t-2 border-[#E6B579]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Stripe Security & Config</span>
          </button>
        </div>

        {/* Core Settings Workspace Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB: DASHBOARD OVERVIEW */}
          {activeAdminTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase">Atelier Overview</span>
                <button
                  onClick={() => { loadStats(); loadOrders(); }}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-400 hover:text-[#E6B579] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Products', value: stats?.totalProducts ?? localProducts.length, icon: Package, accent: 'text-[#E6B579]' },
                  { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ClipboardList, accent: 'text-white' },
                  { label: 'Pending', value: stats?.pendingOrders ?? 0, icon: RefreshCw, accent: 'text-amber-400' },
                  { label: 'Paid / Completed', value: stats?.paidOrders ?? 0, icon: CheckCircle, accent: 'text-emerald-400' },
                  { label: 'Failed / Cancelled', value: stats?.failedOrders ?? 0, icon: AlertTriangle, accent: 'text-rose-400' },
                  { label: `Revenue (${stats?.currency || 'AUD'})`, value: `$${(stats?.revenue ?? 0).toFixed(2)}`, icon: DollarSign, accent: 'text-[#E6B579]' },
                ].map((card) => (
                  <div key={card.label} className="bg-[#03100e] border border-[#E6B579]/15 p-5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400">{card.label}</span>
                      <card.icon className={`w-4 h-4 ${card.accent}`} />
                    </div>
                    <span className={`font-serif text-3xl font-light ${card.accent}`}>{statsLoading ? '—' : card.value}</span>
                  </div>
                ))}
              </div>

              {/* Recent orders preview */}
              <div className="space-y-3">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block border-b border-[#E6B579]/5 pb-2">
                  Latest Orders
                </span>
                {ordersLoading ? (
                  <p className="text-xs text-gray-400 font-mono">Loading orders…</p>
                ) : orders.length === 0 ? (
                  <p className="text-xs text-gray-500 font-mono">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { setActiveAdminTab('orders'); setExpandedOrderId(o.id); }}
                        className="w-full flex items-center justify-between bg-[#03100e] border border-[#E6B579]/10 hover:border-[#E6B579]/30 px-4 py-2.5 text-left transition-colors"
                      >
                        <span className="font-mono text-xs text-white">{o.referenceId}</span>
                        <span className="text-[10px] text-gray-400 font-mono hidden sm:block">{o.customerName}</span>
                        <span className="font-mono text-xs text-[#E6B579]">${o.total.toFixed(2)}</span>
                        <OrderStatusBadge status={o.status} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ORDERS MANAGEMENT */}
          {activeAdminTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(['All', 'Pending', 'Paid', 'Failed', 'Cancelled', 'Refunded'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border transition-all ${
                        orderFilter === f
                          ? 'bg-[#E6B579] text-[#06211E] border-[#E6B579] font-bold'
                          : 'border-[#E6B579]/20 text-gray-300 hover:border-[#E6B579]/60'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-[#03100e] border border-[#E6B579]/20 px-3 py-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search ref / name / email"
                    className="bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none w-48 font-sans"
                  />
                </div>
              </div>

              {ordersError && (
                <p className="text-rose-400 text-[10px] font-mono bg-rose-950/20 border border-rose-500/20 p-2 uppercase tracking-wider">{ordersError}</p>
              )}

              {ordersLoading ? (
                <p className="text-xs text-gray-400 font-mono">Loading orders…</p>
              ) : (
                (() => {
                  const filtered = orders
                    .filter((o) => orderFilter === 'All' || o.status === orderFilter)
                    .filter((o) => {
                      const q = orderSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        o.referenceId.toLowerCase().includes(q) ||
                        (o.customerName || '').toLowerCase().includes(q) ||
                        (o.customerEmail || '').toLowerCase().includes(q)
                      );
                    });
                  if (filtered.length === 0) {
                    return <p className="text-xs text-gray-500 font-mono py-8 text-center">No orders match this view.</p>;
                  }
                  return (
                    <div className="space-y-2">
                      {filtered.map((o) => (
                        <div key={o.id} className="bg-[#03100e] border border-[#E6B579]/10">
                          <button
                            onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                            className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1.2fr_1.5fr_0.8fr_auto_auto] items-center gap-3 px-4 py-3 text-left hover:bg-[#E6B579]/5 transition-colors"
                          >
                            <span className="font-mono text-xs text-white">{o.referenceId}</span>
                            <span className="text-[10px] text-gray-400 font-mono hidden sm:block truncate">{o.customerName} · {o.customerEmail || 'no email'}</span>
                            <span className="font-mono text-xs text-[#E6B579] hidden sm:block">${o.total.toFixed(2)}</span>
                            <OrderStatusBadge status={o.status} />
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedOrderId === o.id ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedOrderId === o.id && (
                            <div className="border-t border-[#E6B579]/10 p-4 space-y-4 bg-[#041917]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Customer</span>
                                  <p className="text-white">{o.customerName}</p>
                                  <p className="text-gray-400">{o.customerPhone}</p>
                                  <p className="text-gray-400">{o.customerEmail}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Delivery</span>
                                  <p className="text-gray-300 whitespace-pre-line">{o.customerAddress}</p>
                                  <p className="text-gray-500">{o.shippingMethod}</p>
                                </div>
                              </div>

                              <div className="border border-[#E6B579]/10">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="text-gray-500 font-mono uppercase text-[9px] border-b border-[#E6B579]/10">
                                      <th className="p-2">Item</th><th className="p-2">Size</th><th className="p-2">SKU</th><th className="p-2">Qty</th><th className="p-2 text-right">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {o.items.map((it, i) => (
                                      <tr key={i} className="border-b border-[#E6B579]/5 last:border-0">
                                        <td className="p-2 text-white">{it.name}</td>
                                        <td className="p-2 text-[#E6B579] font-bold">{it.size}</td>
                                        <td className="p-2 text-gray-400">{it.sku || '—'}</td>
                                        <td className="p-2 text-gray-300">{it.quantity}</td>
                                        <td className="p-2 text-right text-gray-300">${(it.price * it.quantity).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono mr-1">Set status:</span>
                                {(['Pending', 'Paid', 'Failed', 'Cancelled', 'Refunded'] as OrderStatus[]).map((s) => (
                                  <button
                                    key={s}
                                    disabled={updatingOrderId === o.id || o.status === s}
                                    onClick={() => updateOrderStatus(o.id, s)}
                                    className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider border transition-all disabled:opacity-40 ${
                                      o.status === s
                                        ? 'bg-[#E6B579]/15 border-[#E6B579]/40 text-[#E6B579]'
                                        : 'border-[#E6B579]/20 text-gray-300 hover:border-[#E6B579]/60'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                                <span className="ml-auto font-mono text-sm text-[#E6B579] font-bold">${o.total.toFixed(2)} AUD</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* TAB 1: PRODUCT CATALOG MANAGEMENT */}
          {activeAdminTab === 'products' && (
            <div className="space-y-6">
              
              {/* Form to insert new luxury product */}
              <div className="bg-[#03100e] border border-[#E6B579]/15 p-5">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block mb-4 border-b border-[#E6B579]/5 pb-2">
                  Create New Luxury Style
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Style Title</label>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E6B579]"
                      placeholder="e.g. Ivory Silk Emperor Kurta"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Product Category</label>
                    {renderCategoryControl(newProduct.category || 'kurta', (v) => setNewProduct((prev) => ({ ...prev, category: v })))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Retail Price (AUD)</label>
                      <input
                        type="number"
                        className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Stock / Size</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                        value={newStockPerSize}
                        onChange={(e) => setNewStockPerSize(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1 bg-[#06211E]/40 p-3 border border-[#E6B579]/5">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-1">Details & Materials</label>
                    <span className="text-[9px] text-gray-500 block mb-2 font-serif">Separate multiple items with commas</span>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E6B579]"
                      placeholder="Mulberry Silk, Premium flax linen, gold threading"
                      value={newProduct.materials?.join(', ')}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, materials: e.target.value.split(',').map(m => m.trim()) }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Catalog Badge Label</label>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                      placeholder="e.g. Toorak Boutique Selective, Bestseller"
                      value={newProduct.badge}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, badge: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Sizes (comma separated)</label>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E6B579]"
                      placeholder="M, L, XL, XXL"
                      value={newSizesInput}
                      onChange={(e) => setNewSizesInput(e.target.value)}
                    />
                    <span className="text-[9px] text-gray-500 block font-serif">A variant (with the stock above) is created per size.</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Status</label>
                    <select
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                      value={newProduct.status}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, status: e.target.value as Product['status'] }))}
                    >
                      <option value="active">Active (visible &amp; buyable)</option>
                      <option value="draft">Draft (hidden)</option>
                      <option value="out_of_stock">Out of stock (visible, not buyable)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579] resize-none"
                    placeholder="Provide premium description of texture, draping, and luxury craftsmanship..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Images for the new product */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Images</label>
                    <label className={`text-[9px] font-mono uppercase tracking-widest cursor-pointer flex items-center gap-1 ${uploadingFor === 'new' ? 'text-gray-500' : 'text-[#E6B579] hover:text-white'}`}>
                      {uploadingFor === 'new' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploadingFor === 'new' ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFor === 'new'}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadForNew(f); e.currentTarget.value = ''; }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(newProduct.images || []).map((img, idx) => (
                      <div key={idx} className="relative w-14 h-16 border border-[#E6B579]/20 overflow-hidden group">
                        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                        <button
                          type="button"
                          onClick={() => setNewProduct((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }))}
                          className="absolute top-0 right-0 bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579]"
                    placeholder="…or paste an image URL and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v) { setNewProduct((prev) => ({ ...prev, images: [...(prev.images || []), v] })); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                </div>

                <button
                  id="admin-add-product-btn"
                  onClick={handleAddProduct}
                  className="mt-4 px-6 py-2.5 bg-[#E6B579] text-[#06211E] text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#06211E] transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Style To Catalog</span>
                </button>
              </div>

              {/* Editable listings of current products */}
              <div className="space-y-3">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block border-b border-[#E6B579]/5 pb-2">
                  Active Catalogue Inventory
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#03100e] text-gray-400 font-mono uppercase tracking-wider text-[10px] border-b border-[#E6B579]/20">
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 w-32">Price (AUD $)</th>
                        <th className="p-3 w-56">Per-Size Stock</th>
                        <th className="p-3 w-28">Status</th>
                        <th className="p-3 w-28">Featured</th>
                        <th className="p-3 text-center w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6B579]/10">
                      {localProducts.map((p) => (
                        <Fragment key={p.id}>
                        <tr className="hover:bg-[#E6B579]/5 transition-all">
                          <td className="p-3 font-serif font-light text-white text-sm flex items-center gap-2">
                            <img src={p.images[0]} alt="" className="w-8 h-10 object-cover bg-teal-950" />
                            <div>
                              <span>{p.name}</span>
                              {p.badge && (
                                <span className="ml-2 px-1 text-[8px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-gray-400 uppercase tracking-widest">
                            {p.category === 'kurta' ? 'Kurta' : 'T-shirt'}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full bg-[#03100e] border border-[#E6B579]/20 p-1.5 text-xs text-[#E6B579] font-mono text-center"
                              value={p.price}
                              id={`price-edit-p-${p.id}`}
                              onChange={(e) => handleProductPriceChange(p.id, Number(e.target.value))}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                              {p.variants.map((v) => (
                                <label key={v.size} className="flex items-center gap-1 bg-[#03100e] border border-[#E6B579]/20 px-1.5 py-1">
                                  <span className="text-[9px] font-mono text-[#E6B579] uppercase">{v.size}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-10 bg-transparent text-[11px] text-white font-mono text-center focus:outline-none"
                                    value={v.stock}
                                    id={`stock-edit-p-${p.id}-${v.size}`}
                                    onChange={(e) => handleVariantStockChange(p.id, v.size, Number(e.target.value))}
                                  />
                                </label>
                              ))}
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono mt-1 block">Total: {totalStock(p)} units</span>
                          </td>
                          <td className="p-3">
                            <button
                              id={`status-toggle-p-${p.id}`}
                              onClick={() => handleProductCycleStatus(p.id)}
                              title="Click to cycle status"
                              className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border ${
                                p.status === 'active'
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                                  : p.status === 'draft'
                                  ? 'bg-gray-900 border-gray-700 text-gray-400'
                                  : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                              }`}
                            >
                              {p.status === 'active' ? 'Active' : p.status === 'draft' ? 'Draft' : 'Out of stock'}
                            </button>
                          </td>
                          <td className="p-3">
                            <button
                              id={`featured-toggle-p-${p.id}`}
                              onClick={() => handleProductToggleFeatured(p.id)}
                              className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border ${
                                p.isFeatured
                                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 font-bold'
                                  : 'bg-gray-900 border-gray-700 text-gray-500'
                              }`}
                            >
                              {p.isFeatured ? 'Featured' : 'Standard'}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`edit-p-${p.id}`}
                                onClick={() => setEditingProductId(editingProductId === p.id ? null : p.id)}
                                title="Edit product"
                                className={`p-1.5 rounded transition-colors ${
                                  editingProductId === p.id ? 'text-[#06211E] bg-[#E6B579]' : 'text-gray-400 hover:text-[#E6B579] hover:bg-[#E6B579]/10'
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                id={`delete-p-${p.id}`}
                                onClick={() => setDeleteConfirmId(p.id)}
                                title="Delete product"
                                className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/15 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline delete confirmation row */}
                        {deleteConfirmId === p.id && (
                          <tr className="bg-rose-950/10">
                            <td colSpan={7} className="p-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-[11px] font-mono text-rose-300 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  Delete "{p.name}"? This cannot be undone after you Save.
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-gray-700 text-gray-300 hover:border-gray-500"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    id={`confirm-delete-p-${p.id}`}
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest bg-rose-500 text-white hover:bg-rose-400"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Inline product editor row */}
                        {editingProductId === p.id && (
                          <tr className="bg-[#041917]">
                            <td colSpan={7} className="p-4">
                              {renderProductEditor(p)}
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SHIPPING MODIFIERS WITH SO MANY CHANNELS */}
          {activeAdminTab === 'shipping' && (
            <div className="space-y-6">

              {/* Dynamic explanations */}
              <div className="p-4 bg-amber-500/5 border border-amber-400/20 text-xs text-amber-200/80 rounded-none leading-relaxed">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-[#E6B579] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#E6B579] uppercase block mb-1">Australian Logistic Policy Matrices</span>
                    <span>
                      Customers will automatically select standard, express, or custom showroom pick-up. Setting prices here updates the checkout card in real-time. Add free shipping thresholds to automatically trigger complimentary delivery (e.g. standard delivery becomes free above $150 AUD).
                    </span>
                  </div>
                </div>
              </div>

              {/* Form to insert shipping avenue */}
              <div className="bg-[#03100e] border border-[#E6B579]/15 p-5">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block mb-4 border-b border-[#E6B579]/5 pb-2">
                  Introduce Australian Shipping Fleet Channel
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Channel Name</label>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E6B579]"
                      placeholder="e.g. AusPost Regional WA Courier"
                      value={newShipping.name}
                      onChange={(e) => setNewShipping(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Pricing standard (AUD $)</label>
                    <input
                      type="number"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                      value={newShipping.price}
                      onChange={(e) => setNewShipping(prev => ({ ...prev, price: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Estimated Transit Time</label>
                    <input
                      type="text"
                      className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                      placeholder="e.g. 2-3 Business Days"
                      value={newShipping.estimatedDays}
                      onChange={(e) => setNewShipping(prev => ({ ...prev, estimatedDays: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1 mt-4">
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Sourcing Description</label>
                  <input
                    type="text"
                    className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E6B579]"
                    placeholder="Sourcing description (e.g. Insured Express air dispatch via AusPost hubs)"
                    value={newShipping.description}
                    onChange={(e) => setNewShipping(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <button
                  id="admin-add-shipping-btn"
                  onClick={handleAddShippingOption}
                  className="mt-4 px-6 py-2.5 bg-[#E6B579] text-[#06211E] text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-[#06211E] transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Logistics Channel</span>
                </button>
              </div>

              {/* Table of logistics */}
              <div className="space-y-3">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block border-b border-[#E6B579]/5 pb-2">
                  Active Shipping Systems
                </span>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#03100e] text-gray-400 font-mono uppercase tracking-wider text-[10px] border-b border-[#E6B579]/20">
                        <th className="p-3">Logistics Description</th>
                        <th className="p-3 w-28">Transit Time</th>
                        <th className="p-3 w-32">Charge Rate (AUD)</th>
                        <th className="p-3 w-40">Free Threshold Amount</th>
                        <th className="p-3 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6B579]/10">
                      {localConfig.shippingChargeOptions.map((opt) => (
                        <tr key={opt.id} className="hover:bg-[#E6B579]/5 transition-all">
                          <td className="p-3">
                            <span className="font-semibold text-white block text-sm">{opt.name}</span>
                            <span className="text-gray-400 text-[10px] mt-0.5 block">{opt.description}</span>
                          </td>
                          <td className="p-3 font-mono text-gray-300">
                            {opt.estimatedDays}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full bg-[#03100e] border border-[#E6B579]/20 p-1.5 text-xs text-[#E6B579] font-mono text-center"
                              value={opt.price}
                              id={`price-edit-sh-${opt.id}`}
                              onChange={(e) => handleShippingPriceChange(opt.id, Number(e.target.value))}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full bg-[#03100e] border border-[#E6B579]/20 p-1.5 text-xs text-center font-mono"
                              placeholder="Never Free"
                              value={opt.freeAboveAmount || ''}
                              id={`free-edit-sh-${opt.id}`}
                              onChange={(e) => handleShippingFreeThresholdChange(opt.id, e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              id={`delete-sh-${opt.id}`}
                              onClick={() => handleDeleteShippingOption(opt.id)}
                              className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/15 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: GLOBAL CONFIGURATION AND STRIPE KEY */}
          {activeAdminTab === 'global' && (
            <div className="space-y-6">
              
              <div className="p-5 border border-[#E6B579]/15 bg-[#03100e] space-y-4">
                <span className="font-serif text-sm tracking-widest text-[#E6B579] uppercase block border-b border-[#E6B579]/5 pb-2">
                  Stripe Payment Gateways Secure Setup
                </span>

                <div className="space-y-4 leading-relaxed text-xs text-gray-300">
                  <p>
                    This application features dynamic integration with the <strong>Stripe Financial API Platform</strong>. To authorize real live transactions:
                  </p>
                  
                  <div className="p-4 bg-emerald-950/25 border border-emerald-500/25 text-emerald-400 font-mono space-y-1 rounded-none">
                    <p className="font-bold text-emerald-300 uppercase select-none">Configured Keys Detected:</p>
                    <p className="text-[10.5px]">
                      Stripe Status: <span className="text-white font-bold">{localConfig.stripeEnabled ? 'AUTHORIZED' : 'DEACTIVATED'}</span>
                    </p>
                    <p className="text-[9.5px] text-gray-400 mt-1">
                      * Define your secure <code className="text-emerald-300">STRIPE_SECRET_KEY</code> inside the workspace's secrets dashboard or the `.env` local file. The server automatically hooks into it on startup.
                    </p>
                  </div>

                  <div className="h-px bg-[#E6B579]/10" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white uppercase font-serif tracking-widest">Enable Stripe billing gateways</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Toggle to default to simulated local invoice receipts if you want to bypass Stripe redirection during testing.</p>
                    </div>
                    <button
                      id="stripe-toggle-btn"
                      onClick={() => setLocalConfig(prev => ({ ...prev, stripeEnabled: !prev.stripeEnabled }))}
                      className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-all ${
                        localConfig.stripeEnabled
                          ? 'bg-amber-500 text-[#06211E] font-bold'
                          : 'bg-gray-800 border border-gray-700 text-gray-400'
                      }`}
                    >
                      {localConfig.stripeEnabled ? 'Secure Stripe Enabled' : 'Simulated Invoice Mode'}
                    </button>
                  </div>

                  <div className="h-px bg-[#E6B579]/10" />

                  <div className="space-y-2">
                    <h4 className="font-bold text-white uppercase font-serif tracking-widest">Melbourne Flagship Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Boutique Brand Headings</label>
                        <input
                          type="text"
                          className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2 text-xs text-white focus:outline-none focus:border-[#E6B579]"
                          value={localConfig.storeName}
                          onChange={(e) => setLocalConfig(prev => ({ ...prev, storeName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Store Currency Currency</label>
                        <input
                          type="text"
                          disabled
                          className="w-full bg-[#041917] border border-[#E6B579]/10 p-2 text-xs text-gray-500 cursor-not-allowed uppercase font-mono font-bold"
                          value={`${localConfig.currency} ($ Australia Dollars)`}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* Bottom Bar Controls for Synchronization */}
        <div className="p-6 border-t border-[#E6B579]/20 bg-[#03100e] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {statusMsg && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-4 py-2 text-xs font-mono tracking-wider flex items-center gap-1.5 ${
                  statusMsg.type === 'success' 
                    ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/20' 
                    : 'text-rose-400 bg-rose-950/20 border border-rose-500/20'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{statusMsg.text}</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              id="admin-reset-panel"
              onClick={() => {
                setLocalProducts(JSON.parse(JSON.stringify(products)));
                setLocalConfig(JSON.parse(JSON.stringify(config)));
                setStatusMsg(null);
              }}
              className="px-4 py-3 border border-gray-700 hover:border-gray-500 hover:bg-white/5 text-gray-300 text-xs font-mono tracking-widest uppercase transition-all"
            >
              Discard Changes
            </button>
            <button
              id="admin-save-all-btn"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-8 py-3 bg-[#E6B579] hover:bg-white text-[#06211E] text-xs font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    Paid: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
    Pending: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    Failed: 'bg-rose-950/40 border-rose-500/30 text-rose-400',
    Cancelled: 'bg-gray-900 border-gray-700 text-gray-400',
    Refunded: 'bg-sky-950/40 border-sky-500/30 text-sky-400',
  };
  return (
    <span className={`px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border ${map[status]}`}>
      {status}
    </span>
  );
}
