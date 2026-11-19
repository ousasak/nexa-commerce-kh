import React, { useEffect, useState, useRef } from 'react';
import toast from '../../utils/toast';
import {
  Palette,
  ExternalLink,
  Upload,
  Trash2,
  Smartphone,
  Save,
  Wifi,
  Signal,
  Sparkles,
  Loader2,
  Layers,
  Check,
  Image as ImageIcon,
  Sun,
  Moon,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { getShopDetail, updateShop, uploadImage, fullUrl } from '../../api';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loading } from '@/components/ui';

const COLOR_PRESETS = [
  { name: 'Royal Indigo', primary: '#6366f1', secondary: '#ec4899', class: 'bg-indigo-500' },
  { name: 'Emerald Fresh', primary: '#10b981', secondary: '#06b6d4', class: 'bg-emerald-500' },
  { name: 'Sunset Amber', primary: '#f59e0b', secondary: '#ef4444', class: 'bg-amber-500' },
  { name: 'Ocean Cyan', primary: '#0ea5e9', secondary: '#6366f1', class: 'bg-sky-500' },
  { name: 'Rose Berry', primary: '#f43f5e', secondary: '#8b5cf6', class: 'bg-rose-500' },
  { name: 'Modern Slate', primary: '#0f172a', secondary: '#475569', class: 'bg-slate-900' },
];

const FONT_OPTIONS = [
  { id: 'Inter', name: 'Inter (Default Modern)' },
  { id: 'Kantumruy Pro', name: 'Kantumruy Pro (Khmer & Latin Modern)' },
  { id: 'Playfair Display', name: 'Playfair Display (Luxury & Elegant)' },
  { id: 'Montserrat', name: 'Montserrat (Clean Geometric)' },
  { id: 'Roboto', name: 'Roboto (Standard Neutral)' },
];

const DEMO_PREVIEW_PRODUCTS = [
  {
    id: 'demo-1',
    name: 'Iced Spanish Latte',
    category: 'Drinks',
    price: 2.5,
    khr: '10,250 ៛',
    image: '',
    emoji: '☕',
    description: 'Double espresso blended with textured condensed milk, cold ice, and creamy cinnamon foam.',
  },
  {
    id: 'demo-2',
    name: 'Caramel Croissant',
    category: 'Food',
    price: 2.2,
    khr: '9,020 ៛',
    image: '',
    emoji: '🥐',
    description: 'Freshly baked flaky French butter croissant drizzled with warm salted caramel.',
  },
  {
    id: 'demo-3',
    name: 'Uji Matcha Signature',
    category: 'Drinks',
    price: 3.0,
    khr: '12,300 ៛',
    image: '',
    emoji: '🍵',
    description: 'Pure Kyoto ceremonial grade matcha whisked fresh over chilled oat milk.',
  },
  {
    id: 'demo-4',
    name: 'Classic Tiramisu Cake',
    category: 'Dessert',
    price: 3.5,
    khr: '14,350 ៛',
    image: '',
    emoji: '🍰',
    description: 'Traditional Italian espresso-soaked sponge layered with velvety mascarpone cream.',
  },
  {
    id: 'demo-5',
    name: 'Smoked Salmon Bagel',
    category: 'Food',
    price: 4.8,
    khr: '19,680 ៛',
    image: '',
    emoji: '🥯',
    description: 'Toasted seeded bagel with cured Norwegian salmon, capers, and dill cream cheese.',
  },
  {
    id: 'demo-6',
    name: 'Passion Fruit Soda',
    category: 'Drinks',
    price: 2.0,
    khr: '8,200 ៛',
    image: '',
    emoji: '🍹',
    description: 'Sparkling Battambang passion fruit soda with crushed fresh mint and crystal boba.',
  },
];

export default function StorefrontThemePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [realCategories, setRealCategories] = useState<any[]>([]);

  // Interactive phone preview states
  const [cart, setCart] = useState<{ [id: string]: number }>({ 'demo-1': 1, 'demo-2': 1 });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [dynamicIslandExpanded, setDynamicIslandExpanded] = useState(false);

  // Drag-to-scroll refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.clientY;
    scrollTopRef.current = scrollRef.current.scrollTop;
    setIsDraggingState(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dy) > 4) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollTop = scrollTopRef.current - dy;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsDraggingState(false);
  };

  useEffect(() => {
    if (!user?.shop_id) return;
    Promise.allSettled([
      getShopDetail(user.shop_id),
      productService.list(user.shop_id),
      categoryService.list(user.shop_id),
    ])
      .then(([shopRes, prodRes, catRes]) => {
        if (shopRes.status === 'fulfilled') {
          const data = shopRes.value;
          setShop({
            ...data,
            theme: {
              primary: '#6366f1',
              secondary: '#ec4899',
              font_family: 'Inter',
              open_for_orders: true,
              ...(data.theme || {}),
            },
            slideshow: Array.isArray(data.slideshow) ? data.slideshow : [],
          });
        }
        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value) && prodRes.value.length > 0) {
          setRealProducts(prodRes.value);
        }
        if (catRes.status === 'fulfilled' && Array.isArray(catRes.value) && catRes.value.length > 0) {
          setRealCategories(catRes.value);
        }
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load shop theme settings');
      })
      .finally(() => setLoading(false));
  }, [user?.shop_id]);

  useEffect(() => {
    if (!shop?.slideshow || shop.slideshow.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % shop.slideshow.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [shop?.slideshow?.length]);

  const setThemeField = (field: string, val: any) => {
    setShop((prev: any) => ({
      ...prev,
      theme: {
        ...(prev?.theme || {}),
        [field]: val,
      },
    }));
  };

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploadingSlide(true);
    const urls: string[] = [];
    try {
      for (const f of files) {
        const res = await uploadImage(f);
        urls.push(res.url);
      }
      setShop((prev: any) => ({
        ...prev,
        slideshow: [...(prev.slideshow || []), ...urls],
      }));
      toast.success(t('settings.shop.toast.slidesUploaded', 'Slideshow image(s) uploaded'));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('settings.shop.toast.uploadFailed', 'Slideshow upload failed'));
    } finally {
      setUploadingSlide(false);
      e.target.value = '';
    }
  };

  const removeSlide = (idx: number) => {
    setShop((prev: any) => ({
      ...prev,
      slideshow: (prev.slideshow || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  const save = async () => {
    if (!shop || !user?.shop_id) return;
    setSaving(true);
    try {
      await updateShop(user.shop_id, {
        shop_name: shop.shop_name || '',
        logo: shop.logo || '',
        banner: shop.banner || '',
        bio: shop.bio || '',
        description: shop.description || '',
        slideshow: shop.slideshow || [],
        social_media: shop.social_media || {},
        theme: shop.theme || {},
        contact: shop.contact || '',
        currency: shop.currency || 'USD',
        status: shop.status || 'active',
      });
      toast.success(t('settings.shop.toast.saved', 'Storefront theme saved successfully!'));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('settings.shop.toast.saveFailed', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !shop) return <Loading />;

  const themePrimary = shop.theme?.primary || '#6366f1';
  const themeSecondary = shop.theme?.secondary || '#ec4899';
  const themeFont = shop.theme?.font_family || 'Inter';
  const isOpenForOrders = shop.theme?.open_for_orders !== false;
  const storefrontUrl = `http://localhost:3000/${shop.username || user?.username || ''}`;

  const displayProducts = realProducts.length > 0
    ? realProducts.map((p) => ({
        id: String(p.id),
        name: p.name,
        category: p.category_name || (realCategories.find((c) => c.id === p.category_id)?.name) || 'General',
        price: Number(p.sale_price || p.price || 0),
        khr: `${Math.round(Number(p.sale_price || p.price || 0) * 4100).toLocaleString()} ៛`,
        image: p.images?.[0] ? fullUrl(p.images[0]) : '',
        emoji: '🛍️',
        description: p.description || 'Quality product from our store.',
      }))
    : DEMO_PREVIEW_PRODUCTS;

  const categories = ['All', ...Array.from(new Set(displayProducts.map((p) => p.category)))];

  const filteredProducts = displayProducts.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const totalCartPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = displayProducts.find((item) => item.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const addToCart = (id: string, qty = 1) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + qty,
    }));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const resetCart = () => {
    setCart({ 'demo-1': 1, 'demo-2': 1 });
    setShowOrderDrawer(false);
    setSelectedProduct(null);
    setOrderSubmitted(false);
    setSearchQuery('');
    setSelectedCategory('All');
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 font-sans">
      {/* ─── Breadcrumbs & Header Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Breadcrumbs />
          <div className="flex items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Palette className="w-3.5 h-3.5" />
              <span>{t('settings.shop.tabs.theme', 'Storefront Design & Branding')}</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('nav.storefrontTheme', 'Storefront Design')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {t(
              'settings.shop.theme.paletteDescription',
              'Tailor your storefront and mini app brand identity with curated palettes, typography, and promotional slideshows.'
            )}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
          >
            <span>{t('nav.storefront', 'View Storefront')}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <Button
            onClick={save}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs gap-2 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.saving', 'Saving...')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('common.saveChanges', 'Save Changes')}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── 2-Column Grid: Customizer (Left 50%) & Sticky Live Preview (Right 50%) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Color Palette & Slideshow Cards */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6">
          {/* Card 1: Color Palette & Typography */}
          <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel rounded-2xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Palette className="w-4.5 h-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    {t('settings.shop.theme.paletteTitle', 'Color Palette & Typography')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'settings.shop.theme.paletteDescription',
                      'Tailor your storefront and mini app brand identity with curated palettes.'
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-2 space-y-6">
              {/* Quick Preset Colors */}
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('settings.shop.theme.quickPresets', 'Quick Color Presets')}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected =
                      shop.theme?.primary?.toLowerCase() === preset.primary.toLowerCase() &&
                      shop.theme?.secondary?.toLowerCase() === preset.secondary.toLowerCase();

                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setShop({
                            ...shop,
                            theme: {
                              ...(shop.theme || {}),
                              primary: preset.primary,
                              secondary: preset.secondary,
                            },
                          });
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center -space-x-1.5 shrink-0">
                            <span
                              className="size-4.5 rounded-full shadow-xs border border-white dark:border-slate-900"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="size-3.5 rounded-full shadow-xs border border-white dark:border-slate-900"
                              style={{ backgroundColor: preset.secondary }}
                            />
                          </div>
                          <span className="truncate text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                            {preset.name}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Codes (Primary & Accent) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('settings.shop.theme.primaryColor', 'Primary Color')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themePrimary}
                      onChange={(e) => setThemeField('primary', e.target.value)}
                      className="size-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themePrimary}
                      onChange={(e) => setThemeField('primary', e.target.value)}
                      className="h-9 font-mono text-xs uppercase"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('settings.shop.theme.secondaryAccent', 'Secondary Accent')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeSecondary}
                      onChange={(e) => setThemeField('secondary', e.target.value)}
                      className="size-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeSecondary}
                      onChange={(e) => setThemeField('secondary', e.target.value)}
                      className="h-9 font-mono text-xs uppercase"
                      placeholder="#ec4899"
                    />
                  </div>
                </div>
              </div>

              {/* Font Family Selector */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('settings.shop.theme.fontFamily', 'Font Family')}
                </Label>
                <select
                  value={themeFont}
                  onChange={(e) => setThemeField('font_family', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Promotional Slideshow Banners */}
          <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel rounded-2xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      {t('settings.shop.theme.slideshowTitle', 'Promotional Slideshow (Banners)')}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t(
                        'settings.shop.theme.slideshowDescription',
                        'Upload promotional banners for your online store homepage carousel.'
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="shrink-0">
                  <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold cursor-pointer shadow-xs transition-all">
                    {uploadingSlide ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{t('settings.shop.theme.addSlide', 'Add Slide Banner')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleSlideUpload}
                      disabled={uploadingSlide}
                    />
                  </label>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-2">
              {shop.slideshow && shop.slideshow.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {shop.slideshow.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 aspect-2/1 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={fullUrl(img)}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white font-mono text-[10px] font-bold backdrop-blur-xs">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSlide(idx)}
                        className="absolute top-2.5 right-2.5 size-7 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                        title={t('common.delete', 'Remove slide')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('settings.shop.theme.noSlideshow', 'No promotional slide banners uploaded yet.')}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {t(
                      'settings.shop.theme.slideshowHint',
                      'Add promotional banners or daily highlights to attract customer orders.'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Live Mobile Storefront Preview Mockup (50% Equal Width) */}
        <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-6 space-y-4">
          <Card className="overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-panel bg-white dark:bg-slate-900 rounded-2xl">
            <CardHeader className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block leading-tight">
                    {t('settings.shop.preview.livePreview', 'Live Storefront Preview')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    អូស និង Click បញ្ជាទិញដូចទូរស័ព្ទពិត
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Light / Dark Storefront Preview Switcher (Matching Height & Size) */}
                <button
                  type="button"
                  onClick={() => setPreviewMode(previewMode === 'light' ? 'dark' : 'light')}
                  className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer shadow-2xs"
                  title="Toggle Light / Dark Storefront View"
                >
                  {previewMode === 'light' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </>
                  )}
                </button>
                <Badge
                  variant="outline"
                  className="h-7 px-2.5 rounded-lg text-[11px] font-bold text-primary border-primary/30 bg-primary/10 inline-flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex justify-center items-center bg-slate-100/60 dark:bg-slate-950/40 overflow-hidden">
              {/* Ultra-Clean Modern iPhone Chassis (Frameless, Minimalist Bezel) */}
              <div className="relative mx-auto select-none my-1">
                {/* Sleek Titanium Bezel */}
                <div className="w-[330px] sm:w-[355px] rounded-[48px] p-[8px] bg-slate-900 ring-1 ring-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)_inset]">
                  {/* Clean Edge-to-Edge Screen */}
                  <div
                    className={`w-full rounded-[40px] overflow-hidden flex flex-col h-[670px] sm:h-[700px] relative font-sans shadow-inner transition-colors duration-200 ${
                      previewMode === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'
                    }`}
                    style={{ fontFamily: themeFont }}
                  >
                    {/* Floating Status Bar & Dynamic Island */}
                    <div className="absolute top-0 inset-x-0 h-11 px-6 flex items-center justify-between text-[11px] font-semibold shrink-0 select-none z-30 pt-1 pointer-events-none">
                      <span className="text-white drop-shadow-xs">9:41</span>

                      {/* Interactive Dynamic Island (Click to expand) */}
                      <button
                        type="button"
                        onClick={() => setDynamicIslandExpanded(!dynamicIslandExpanded)}
                        className={`pointer-events-auto bg-black rounded-full flex items-center justify-between px-2.5 shadow-sm border border-white/10 transition-all duration-300 cursor-pointer ${
                          dynamicIslandExpanded ? 'w-48 h-7 text-[10px] text-emerald-400 font-bold px-3' : 'w-24 h-6'
                        }`}
                        title="Dynamic Island"
                      >
                        {dynamicIslandExpanded ? (
                          <>
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{isOpenForOrders ? 'Store Open' : 'Store Closed'}</span>
                            </span>
                            <span className="text-white text-[9px] font-normal opacity-80">
                              {totalCartCount} items
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="size-2 rounded-full bg-[#161a23] ring-1 ring-white/10" />
                            <div className="size-2 rounded-full bg-[#0d1117] ring-1 ring-blue-500/20" />
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 text-white drop-shadow-xs">
                        <Signal className="w-3 h-3" />
                        <Wifi className="w-3 h-3" />
                        <div className="w-5 h-2.5 border border-white/80 rounded-[3px] p-[1px] flex items-center">
                          <div className="w-full h-full bg-emerald-400 rounded-[1.5px]" />
                        </div>
                      </div>
                    </div>

                    {/* Storefront Content Preview (Scrollable & Mouse Drag-to-Scroll - Hidden Scrollbar like Native iOS) */}
                    <div
                      ref={scrollRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                      className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 pb-20 select-none ${
                        isDraggingState ? 'cursor-grabbing' : 'cursor-grab'
                      }`}
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <div>
                        {/* Banner Header with Seamless Flow under Status Bar */}
                        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-900">
                          {shop.banner ? (
                            <img
                              src={fullUrl(shop.banner)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{
                                background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeSecondary} 100%)`,
                              }}
                            />
                          )}
                          <div
                            className={`absolute inset-0 ${
                              previewMode === 'light'
                                ? 'bg-gradient-to-t from-slate-50 via-slate-50/20 to-black/30'
                                : 'bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/40'
                            }`}
                          />

                          {/* Store Avatar with Verified Ring */}
                          <div className="absolute -bottom-5 left-4 z-10 flex items-end gap-2.5">
                            <div className="relative">
                              <Avatar
                                className={`w-14 h-14 rounded-2xl border-[3px] shadow-lg object-cover ring-1 ${
                                  previewMode === 'light'
                                    ? 'border-white bg-white ring-black/5'
                                    : 'border-slate-950 bg-slate-900 ring-white/15'
                                }`}
                              >
                                <AvatarImage src={shop.logo ? fullUrl(shop.logo) : ''} alt={shop.shop_name} />
                                <AvatarFallback
                                  className="text-base font-bold text-white shadow-inner"
                                  style={{ backgroundColor: themePrimary }}
                                >
                                  {shop.shop_name?.charAt(0) || '🏪'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="size-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center absolute -bottom-1 -right-1 border-2 border-white dark:border-slate-950 shadow-xs">
                                ✓
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Store Details */}
                        <div className="pt-7 px-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <h4
                                className={`font-extrabold text-sm truncate max-w-[200px] tracking-tight ${
                                  previewMode === 'light' ? 'text-slate-900' : 'text-white'
                                }`}
                              >
                                {shop.shop_name || 'My Store'}
                              </h4>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1 ${
                                  isOpenForOrders
                                    ? previewMode === 'light'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/60'
                                    : previewMode === 'light'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-rose-950/90 text-rose-400 border border-rose-700/60'
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    isOpenForOrders ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                                  }`}
                                />
                                <span>
                                  {isOpenForOrders
                                    ? t('settings.shop.openForOrders', 'Open')
                                    : t('settings.shop.storeClosed', 'Closed')}
                                </span>
                              </span>
                            </div>
                            <p
                              className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                                previewMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              {shop.bio ||
                                t('settings.shop.preview.welcomeBio', 'Welcome to our store! Fast and friendly service.')}
                            </p>

                            {/* Store Rating & Delivery Badges */}
                            <div
                              className={`flex items-center gap-2 text-[10px] mt-2 font-medium ${
                                previewMode === 'light' ? 'text-slate-600' : 'text-slate-400'
                              }`}
                            >
                              <span className="flex items-center gap-1 text-amber-500 font-bold">
                                ★ 4.9 <span className="opacity-70 font-normal">(120+)</span>
                              </span>
                              <span>•</span>
                              <span>⚡ 15-25 min</span>
                              <span>•</span>
                              <span>🇰🇭 KHQR Ready</span>
                            </div>
                          </div>

                          {/* Mini Interactive Search Input */}
                          <div className="relative pt-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="ស្វែងរកទំនិញ / Search menu..."
                              className={`w-full h-8 pl-8 pr-7 rounded-xl text-[11px] font-medium border outline-none transition-colors ${
                                previewMode === 'light'
                                  ? 'bg-white border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:border-primary shadow-2xs'
                                  : 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-primary'
                              }`}
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Live Slideshow Carousel in Preview */}
                          {shop.slideshow && shop.slideshow.length > 0 && (
                            <div
                              className={`relative rounded-2xl overflow-hidden aspect-16/8 border shadow-xs ${
                                previewMode === 'light'
                                  ? 'bg-slate-200/70 border-slate-200'
                                  : 'bg-slate-900 border-slate-800'
                              }`}
                            >
                              <img
                                src={fullUrl(shop.slideshow[activeSlideIdx % shop.slideshow.length])}
                                alt="Slide Preview"
                                className="w-full h-full object-cover transition-all duration-500"
                              />
                              {/* Slide dots */}
                              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full">
                                {shop.slideshow.map((_: any, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveSlideIdx(idx)}
                                    className={`size-1.5 rounded-full transition-all cursor-pointer ${
                                      idx === (activeSlideIdx % shop.slideshow.length)
                                        ? 'bg-white w-3'
                                        : 'bg-white/40 hover:bg-white/70'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive Category Filter Chips */}
                          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                            {categories.map((cat) => {
                              const isSelected = selectedCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    if (hasDraggedRef.current) return;
                                    setSelectedCategory(cat);
                                  }}
                                  className={`px-3 py-1 rounded-full font-semibold shrink-0 border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'text-white shadow-xs border-transparent'
                                      : previewMode === 'light'
                                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                  }`}
                                  style={isSelected ? { backgroundColor: themePrimary } : undefined}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>

                          {/* Interactive Products List (Click item for details, or click + to add) */}
                          <div className="space-y-2 pt-1">
                            {filteredProducts.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                គ្មានទំនិញក្នុងក្រុមនេះទេ / No items found
                              </div>
                            ) : (
                              filteredProducts.map((item) => {
                                const countInCart = cart[item.id] || 0;
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      if (hasDraggedRef.current) return;
                                      setSelectedProduct(item);
                                      setDetailQuantity(1);
                                    }}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                      previewMode === 'light'
                                        ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs'
                                        : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {item.image ? (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="size-11 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                                        />
                                      ) : (
                                        <div
                                          className={`size-11 rounded-lg border flex items-center justify-center text-xl shrink-0 shadow-2xs ${
                                            previewMode === 'light'
                                              ? 'bg-slate-100/90 border-slate-200/70'
                                              : 'bg-slate-800 border-slate-700/60'
                                          }`}
                                        >
                                          {item.emoji}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={`text-[11px] font-bold leading-tight truncate ${
                                            previewMode === 'light' ? 'text-slate-900' : 'text-white'
                                          }`}
                                        >
                                          {item.name}
                                        </p>
                                        <p
                                          className={`text-[10px] mt-0.5 font-medium ${
                                            previewMode === 'light' ? 'text-slate-500' : 'text-slate-400'
                                          }`}
                                        >
                                          ${item.price.toFixed(2)} · {item.khr}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Counter or Add Button */}
                                    <div
                                      className="flex items-center gap-1 shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {countInCart > 0 ? (
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                          <button
                                            type="button"
                                            onClick={() => updateCartQty(item.id, -1)}
                                            className="size-5 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-transform"
                                          >
                                            <Minus className="w-2.5 h-2.5" />
                                          </button>
                                          <span className="text-[11px] font-bold px-1 text-slate-800 dark:text-slate-100 min-w-[14px] text-center">
                                            {countInCart}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => updateCartQty(item.id, 1)}
                                            className="size-5 rounded-md flex items-center justify-center text-white active:scale-95 transition-transform"
                                            style={{ backgroundColor: themePrimary }}
                                          >
                                            <Plus className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => addToCart(item.id, 1)}
                                          className="size-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs hover:brightness-110 active:scale-90 transition-transform cursor-pointer"
                                          style={{ backgroundColor: themePrimary }}
                                          title="Add to Cart"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Floating Order Action & iPhone Home Indicator */}
                    <div
                      className={`absolute bottom-0 inset-x-0 p-3 pt-2 z-20 pointer-events-auto ${
                        previewMode === 'light'
                          ? 'bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent'
                          : 'bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setShowOrderDrawer(true)}
                        className="w-full py-2.5 px-4 rounded-xl text-center text-white font-bold text-xs shadow-md flex items-center justify-between transition-transform active:scale-98 cursor-pointer hover:brightness-105"
                        style={{
                          background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeSecondary} 100%)`,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{t('settings.shop.preview.orderNow', 'Order Now')}</span>
                        </div>
                        <span className="text-[10px] font-semibold bg-black/25 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                          <span>{totalCartCount} items</span>
                          <span>•</span>
                          <span>${totalCartPrice.toFixed(2)}</span>
                        </span>
                      </button>

                      {/* iPhone Home Indicator bar */}
                      <div
                        className={`w-32 h-1 rounded-full mx-auto mt-2.5 ${
                          previewMode === 'light' ? 'bg-slate-300' : 'bg-white/40'
                        }`}
                      />
                    </div>

                    {/* ─── Interactive Modal 1: Product Detail Sheet ─────────────── */}
                    {selectedProduct && (
                      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-150">
                        <div
                          className={`rounded-t-[28px] p-4 space-y-3.5 shadow-2xl border-t transition-colors ${
                            previewMode === 'light'
                              ? 'bg-white border-slate-200 text-slate-900'
                              : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                              {selectedProduct.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(null)}
                              className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            {selectedProduct.image ? (
                              <img
                                src={selectedProduct.image}
                                alt={selectedProduct.name}
                                className="size-16 rounded-xl object-cover shrink-0 border"
                              />
                            ) : (
                              <div className="size-16 rounded-xl bg-slate-100 dark:bg-slate-800 border flex items-center justify-center text-3xl shrink-0">
                                {selectedProduct.emoji}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-sm leading-snug">{selectedProduct.name}</h5>
                              <p className="text-xs font-bold text-primary mt-0.5">
                                ${selectedProduct.price.toFixed(2)} ·{' '}
                                <span className="opacity-70 font-normal">{selectedProduct.khr}</span>
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {selectedProduct.description}
                          </p>

                          {/* Quantity Selector & Add Button */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center border rounded-xl p-1 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                                className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="text-xs font-bold px-2.5 min-w-[24px] text-center">
                                {detailQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDetailQuantity((q) => q + 1)}
                                className="size-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                addToCart(selectedProduct.id, detailQuantity);
                                setSelectedProduct(null);
                              }}
                              className="flex-1 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                              style={{ backgroundColor: themePrimary }}
                            >
                              <ShoppingBag className="size-3.5" />
                              <span>Add • ${(selectedProduct.price * detailQuantity).toFixed(2)}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── Interactive Modal 2: Cart & Order Drawer ──────────────── */}
                    {showOrderDrawer && (
                      <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-150">
                        <div
                          className={`rounded-t-[28px] p-4 max-h-[85%] flex flex-col shadow-2xl border-t transition-colors ${
                            previewMode === 'light'
                              ? 'bg-white border-slate-200 text-slate-900'
                              : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="size-4 text-primary" />
                              <h5 className="font-extrabold text-sm">Cart & Order ({totalCartCount})</h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowOrderDrawer(false)}
                              className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>

                          {orderSubmitted ? (
                            <div className="py-8 text-center space-y-2">
                              <CheckCircle2 className="size-12 text-emerald-500 mx-auto animate-bounce" />
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                Order Sent Successfully!
                              </h4>
                              <p className="text-xs text-slate-500">
                                Received by {shop.shop_name || 'store'}. Thank you!
                              </p>
                            </div>
                          ) : totalCartCount === 0 ? (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                              <ShoppingBag className="size-10 mx-auto opacity-50" />
                              <p className="text-xs font-semibold">Your cart is currently empty.</p>
                            </div>
                          ) : (
                            <>
                              {/* Scrollable list of cart items */}
                              <div className="overflow-y-auto max-h-48 space-y-2 py-3 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {Object.entries(cart).map(([id, qty]) => {
                                  const item = displayProducts.find((p) => p.id === id);
                                  if (!item) return null;
                                  return (
                                    <div
                                      key={id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">
                                          ${(item.price * qty).toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => updateCartQty(id, -1)}
                                          className="size-6 rounded-md bg-white dark:bg-slate-700 border flex items-center justify-center font-bold cursor-pointer"
                                        >
                                          <Minus className="size-2.5" />
                                        </button>
                                        <span className="font-bold text-xs min-w-[16px] text-center">{qty}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateCartQty(id, 1)}
                                          className="size-6 rounded-md text-white flex items-center justify-center font-bold cursor-pointer"
                                          style={{ backgroundColor: themePrimary }}
                                        >
                                          <Plus className="size-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Payment & Subtotal */}
                              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <div className="flex justify-between text-slate-500">
                                  <span>Payment</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    🇰🇭 KHQR Ready
                                  </span>
                                </div>
                                <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                                  <span>Total</span>
                                  <span>
                                    ${totalCartPrice.toFixed(2)} ·{' '}
                                    <span className="text-xs font-normal opacity-70">
                                      {Math.round(totalCartPrice * 4100).toLocaleString()} ៛
                                    </span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderSubmitted(true);
                                    setTimeout(() => {
                                      setCart({});
                                      setShowOrderDrawer(false);
                                      setOrderSubmitted(false);
                                    }, 1800);
                                  }}
                                  className="w-full h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer mt-2"
                                  style={{
                                    background: `linear-gradient(135deg, ${themePrimary} 0%, ${themeSecondary} 100%)`,
                                  }}
                                >
                                  <Sparkles className="size-3.5" />
                                  <span>Confirm Demo Order</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

