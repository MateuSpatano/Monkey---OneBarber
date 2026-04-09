import { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Package, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { ProductModal } from '@/components/products/ProductModal';
import { AdvancedFilter, FilterOption, FilterValue } from '@/components/filters/AdvancedFilter';

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

  const filteredProducts = products.filter((product) => {
    // Text search
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Advanced filters
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos/Serviços</h1>
          <p className="text-muted-foreground">Gerencie produtos e serviços do sistema</p>
        </div>
        {(canCreate('products') || isAdmin) && (
          <Button onClick={() => openModal('create')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos ou serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <AdvancedFilter
          filters={productFilters}
          values={filterValues}
          onChange={setFilterValues}
          onClear={() => setFilterValues({})}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        {product.type === 'service' ? (
                          <Scissors className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.type === 'service' ? 'secondary' : 'outline'}>
                      {product.type === 'service' ? 'Serviço' : 'Produto'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    {product.type === 'service' ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <>
                        <span className={product.stock_quantity <= product.min_stock ? 'text-destructive font-medium' : ''}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.min_stock && (
                          <span className="text-xs text-muted-foreground ml-1">(baixo)</span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => openModal('view', product)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {(canEdit('products') || isAdmin) && (
                          <DropdownMenuItem onClick={() => openModal('edit', product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {(canDelete('products') || isAdmin) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedProduct(product);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{selectedProduct?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Modal */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
