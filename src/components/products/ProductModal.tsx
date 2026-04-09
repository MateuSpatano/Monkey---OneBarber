import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Loader2 } from 'lucide-react';

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
}

interface RawMaterial {
  id?: string;
  product_id: string;
  quantity: number;
  product_name?: string;
}

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'view' | 'create' | 'edit';
  product: Product | null;
  onSuccess: () => void;
}

export function ProductModal({ open, onOpenChange, mode, product, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastro');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: 0,
    cost: 0,
    stock_quantity: 0,
    min_stock: 0,
    status: 'active',
    type: 'product',
    duration_minutes: 30,
  });
  const { toast } = useToast();

  const generateSKU = () => {
    const prefix = formData.type === 'service' ? 'SRV' : 'PRD';
    const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  };

  useEffect(() => {
    if (open) {
      fetchAvailableProducts();
    }
  }, [open]);

  useEffect(() => {
    if (product && (mode === 'view' || mode === 'edit')) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        category: product.category || '',
        price: product.price,
        cost: product.cost,
        stock_quantity: product.stock_quantity,
        min_stock: product.min_stock,
        status: product.status,
        type: product.type || 'product',
        duration_minutes: (product as any).duration_minutes || 30,
      });
      if (product.type === 'service') {
        fetchRawMaterials(product.id);
      }
    } else {
      resetForm();
    }
  }, [product, mode, open]);

  // Auto-generate SKU for new products
  useEffect(() => {
    if (mode === 'create' && !formData.sku) {
      setFormData(prev => ({ ...prev, sku: generateSKU() }));
    }
  }, [mode, formData.type]);

  const resetForm = () => {
    const sku = mode === 'create' ? generateSKU() : '';
    setFormData({
      name: '',
      description: '',
      sku,
      category: '',
      price: 0,
      cost: 0,
      stock_quantity: 0,
      min_stock: 0,
      status: 'active',
      type: 'product',
      duration_minutes: 30,
    });
    setRawMaterials([]);
    setActiveTab('cadastro');
  };

  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'product')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error.message);
    }
  };

  const fetchRawMaterials = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_raw_materials')
        .select(`
          id,
          product_id,
          quantity,
          products:product_id (name)
        `)
        .eq('service_id', serviceId);

      if (error) throw error;
      
      const materials = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product_name: item.products?.name || '',
      }));
      setRawMaterials(materials);
    } catch (error: any) {
      console.error('Error fetching raw materials:', error.message);
    }
  };

  const handleAddRawMaterial = () => {
    setRawMaterials([...rawMaterials, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveRawMaterial = (index: number) => {
    const updated = rawMaterials.filter((_, i) => i !== index);
    setRawMaterials(updated);
  };

  const handleRawMaterialChange = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const updated = [...rawMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setRawMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'O nome é obrigatório.',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        category: formData.type === 'product' ? formData.category || null : null,
        price: formData.price,
        cost: formData.cost,
        stock_quantity: formData.type === 'product' ? formData.stock_quantity : 0,
        min_stock: formData.type === 'product' ? formData.min_stock : 0,
        status: formData.status,
        type: formData.type,
        duration_minutes: formData.type === 'service' ? formData.duration_minutes : null,
      };

      let productId = product?.id;

      if (mode === 'create') {
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
        toast({ title: `${formData.type === 'service' ? 'Serviço' : 'Produto'} criado com sucesso!` });
      } else {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product!.id);
        if (error) throw error;
        toast({ title: `${formData.type === 'service' ? 'Serviço' : 'Produto'} atualizado com sucesso!` });
      }

      // Save raw materials if it's a service
      if (formData.type === 'service' && productId) {
        // Delete existing raw materials
        await supabase
          .from('product_raw_materials')
          .delete()
          .eq('service_id', productId);

        // Insert new raw materials
        const validMaterials = rawMaterials.filter(m => m.product_id && m.quantity > 0);
        if (validMaterials.length > 0) {
          const materialsToInsert = validMaterials.map(m => ({
            service_id: productId,
            product_id: m.product_id,
            quantity: m.quantity,
          }));
          
          const { error: matError } = await supabase
            .from('product_raw_materials')
            .insert(materialsToInsert);
          
          if (matError) throw matError;
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = mode === 'view';
  const isService = formData.type === 'service';
  const title = mode === 'create' 
    ? `Novo ${isService ? 'Serviço' : 'Produto'}` 
    : mode === 'edit' 
    ? `Editar ${isService ? 'Serviço' : 'Produto'}` 
    : `Detalhes do ${isService ? 'Serviço' : 'Produto'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-6 sm:p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isService ? 'grid-cols-2' : 'grid-cols-1'} bg-secondary/50 p-1.5 rounded-2xl h-14`}>
              <TabsTrigger value="cadastro" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">Cadastro</TabsTrigger>
              {isService && (
                <TabsTrigger value="materia-prima" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">
                  Matéria Prima
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab 1: Cadastro */}
            <TabsContent value="cadastro" className="space-y-4 pt-4">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={isReadOnly || mode === 'edit'}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="product" id="type-product" />
                    <Label htmlFor="type-product" className="cursor-pointer">Produto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="service" id="type-service" />
                    <Label htmlFor="type-service" className="cursor-pointer">Serviço</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isReadOnly}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Valor (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isService && (
                  <div>
                    <Label htmlFor="duration_minutes">Duração (minutos) *</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      disabled={isReadOnly}
                      required={isService}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isReadOnly}
                    rows={2}
                  />
                </div>

                {/* Product-specific fields */}
                {!isService && (
                  <>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        disabled={isReadOnly}
                        placeholder="Ex: Cabelo, Barba, Cosméticos"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          disabled={isReadOnly}
                          className="flex-1"
                        />
                        {!isReadOnly && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, sku: generateSKU() })}>
                            Gerar
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="stock_quantity">Estoque Atual</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <Label htmlFor="min_stock">Estoque Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cost">Custo (R$)</Label>
                      <Input
                        id="cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                        disabled={isReadOnly}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>



            {/* Tab 3: Matéria Prima */}
            <TabsContent value="materia-prima" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Consumo de Produtos</h3>
                    <p className="text-xs text-muted-foreground">
                      Defina quais produtos do estoque são consumidos ao realizar este serviço.
                    </p>
                  </div>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={handleAddRawMaterial}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {rawMaterials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    Nenhum produto de consumo adicionado.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rawMaterials.map((material, index) => (
                      <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <Label>Produto</Label>
                          <Select
                            value={material.product_id}
                            onValueChange={(value) => handleRawMaterialChange(index, 'product_id', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProducts
                                .filter(p => p.id !== product?.id)
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={material.quantity}
                            onChange={(e) => handleRawMaterialChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={isReadOnly}
                          />
                        </div>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveRawMaterial(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t border-black/5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="premium-button-ghost h-11 px-6">
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={loading} className="premium-button-solid h-11 px-8 shadow-lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : 'Salvar'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
