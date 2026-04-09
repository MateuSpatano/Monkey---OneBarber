import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Package, Scissors, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { ProductModal } from '@/components/products/ProductModal';
import { StockEntryModal } from '@/components/products/StockEntryModal';
import { AdvancedFilter, FilterOption, FilterValue } from '@/components/filters/AdvancedFilter';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock: number;
  status: string;
  type: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  csosn: string | null;
  origin: string | null;
  icms_rate: number | null;
  service_code: string | null;
  iss_rate: number | null;
  created_at: string;
}

const productFilters: FilterOption[] = [
  {
    key: 'type',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'product', label: 'Produto' },
      { value: 'service', label: 'Serviço' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Ativo' },
      { value: 'inactive', label: 'Inativo' },
    ],
  },
  {
    key: 'category',
    label: 'Categoria',
    type: 'text',
    placeholder: 'Filtrar por categoria',
  },
  {
    key: 'priceMin',
    label: 'Preço Mínimo',
    type: 'number',
    placeholder: 'R$ 0,00',
  },
  {
    key: 'priceMax',
    label: 'Preço Máximo',
    type: 'number',
    placeholder: 'R$ 999,00',
  },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<{ id: string; name: string; stock_quantity: number } | null>(null);
  const { toast } = useToast();
  const { canCreate, canEdit, canDelete, isAdmin } = usePermissionsContext();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar produtos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id);

      if (error) throw error;

      toast({
        title: 'Produto excluído',
        description: 'O produto foi excluído com sucesso.',
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir produto',
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const openModal = (mode: 'view' | 'create' | 'edit', product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product || null);
    setModalOpen(true);
  };

  const handleStockEntry = (product: Product) => {
    setStockProduct({ id: product.id, name: product.name, stock_quantity: product.stock_quantity });
    setStockModalOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !filterValues.type || product.type === filterValues.type;
    const matchesStatus = !filterValues.status || product.status === filterValues.status;
    const matchesCategory =
      !filterValues.category ||
      product.category?.toLowerCase().includes(filterValues.category.toLowerCase());
    const matchesPriceMin =
      !filterValues.priceMin || product.price >= parseFloat(filterValues.priceMin);
    const matchesPriceMax =
      !filterValues.priceMax || product.price <= parseFloat(filterValues.priceMax);

    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesPriceMin && matchesPriceMax;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Produtos & Serviços</h1>
          <p className="text-muted-foreground mt-2 sm:mt-3 font-medium text-sm sm:text-base">Gestão de catálogo e controle de inventário</p>
        </div>
        {(canCreate('products') || isAdmin) && (
          <Button onClick={() => openModal('create')} className="premium-button-solid h-11 sm:h-12 shadow-xl w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            Novo Item
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-[28px] overflow-x-auto no-scrollbar whitespace-nowrap w-full sm:w-fit">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm rounded-xl h-10 font-medium w-full"
            />
          </div>
          <div className="h-6 w-[1px] bg-zinc-300 mx-1 hidden sm:block" />
          <AdvancedFilter
            filters={productFilters}
            values={filterValues}
            onChange={setFilterValues}
            onClear={() => setFilterValues({})}
          />
        </div>
      </div>

      {/* Table Section */}
      <Card className="premium-card overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-b border-black/5">
                <TableHead className="w-[350px] text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 pl-8">Item</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Categoria</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Preço</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5">Estoque</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-widest text-zinc-500 py-5 text-center">Status</TableHead>
                <TableHead className="w-[80px] py-5 pr-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold">Carregando itens...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold">Nenhum item encontrado.</TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="group hover:bg-zinc-50/50 transition-colors border-b border-black/5 last:border-0">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                          product.type === 'service' ? "bg-purple-50 text-purple-600 group-hover:bg-purple-100" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                        )}>
                          {product.type === 'service' ? <Scissors className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{product.name || 'Sem nome'}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{product.sku || 'Sem SKU'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <span className="text-zinc-600 font-bold text-sm bg-zinc-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {product.category || 'Geral'}
                      </span>
                    </TableCell>
                    <TableCell className="py-5">
                      <span className="text-zinc-900 font-black">{formatCurrency(product.price)}</span>
                    </TableCell>
                    <TableCell className="py-5">
                      {product.type === 'service' ? (
                        <span className="text-zinc-300 font-black">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-black", product.stock_quantity <= (product.min_stock || 0) ? 'text-red-600' : 'text-zinc-700')}>
                            {product.stock_quantity}
                          </span>
                          {product.stock_quantity <= (product.min_stock || 0) && (
                            <Badge className="bg-red-50 text-red-600 text-[9px] uppercase font-black border-none px-1.5 py-0 h-4">Crítico</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-5 text-center">
                      <Badge className={cn(
                        "text-[10px] uppercase font-black tracking-widest rounded-lg border-none",
                        product.status === 'active' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {product.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-zinc-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 min-w-[180px]">
                          <DropdownMenuItem onClick={() => openModal('view', product)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                            <Eye className="h-4 w-4 text-zinc-400" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal('edit', product)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 focus:bg-zinc-50 transition-colors">
                            <Pencil className="h-4 w-4 text-zinc-400" /> Editar Item
                          </DropdownMenuItem>
                          {product.type === 'product' && (
                            <DropdownMenuItem onClick={() => handleStockEntry(product)} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 text-primary focus:bg-primary/5 focus:text-primary transition-colors">
                              <PackagePlus className="h-4 w-4" /> Gestão de Estoque
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-black/5 my-1" />
                          <DropdownMenuItem onClick={() => { setSelectedProduct(product); setDeleteDialogOpen(true); }} className="rounded-xl px-4 py-2.5 font-bold text-xs flex gap-3 text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors">
                            <Trash2 className="h-4 w-4" /> Excluir Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <StockEntryModal
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        product={stockProduct}
        onSuccess={fetchProducts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Deseja excluir este item?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-zinc-500">
              Esta ação não pode ser desfeita. Considere inativar o item para manter o histórico de vendas/serviços.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-2xl border-none bg-zinc-100 font-bold h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-red-600 hover:bg-red-700 font-bold h-11">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
