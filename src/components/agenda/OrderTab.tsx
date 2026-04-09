import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Search, Loader2, Package, Scissors } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  id?: string;
  item_type: "service" | "product";
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  professional_id?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  type: string;
  stock_quantity: number | null;
}

interface OrderTabProps {
  appointmentId: string;
  initialService: { name: string; price: number; id?: string } | null;
  professionalId: string | null;
  orderItems: OrderItem[];
  onItemsChange: (items: OrderItem[]) => void;
  isLoading?: boolean;
}

export function OrderTab({
  appointmentId,
  initialService,
  professionalId,
  orderItems,
  onItemsChange,
  isLoading = false,
}: OrderTabProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState<"service" | "product">("service");

  // Fetch services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, type, stock_quantity")
        .eq("type", "service")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, type, stock_quantity")
        .eq("type", "product")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    return services.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const addItem = (product: Product, type: "service" | "product") => {
    // Check if already in order
    const existingIndex = orderItems.findIndex(
      (item) => item.product_id === product.id && item.item_type === type
    );

    if (existingIndex >= 0) {
      // Increment quantity
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total_price =
        updatedItems[existingIndex].quantity * updatedItems[existingIndex].unit_price;
      onItemsChange(updatedItems);
    } else {
      // Add new item
      const newItem: OrderItem = {
        item_type: type,
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        professional_id: professionalId || undefined,
      };
      onItemsChange([...orderItems, newItem]);
    }
    setSearchOpen(false);
    setSearchQuery("");
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total_price = newQuantity * updatedItems[index].unit_price;
    onItemsChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  }, [orderItems]);

  return (
    <div className="flex flex-col h-full">
      {/* Add Item Button */}
      <div className="mb-4">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as "service" | "product")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="service" className="gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviços
                </TabsTrigger>
                <TabsTrigger value="product" className="gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </TabsTrigger>
              </TabsList>
              <div className="p-2">
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
              </div>
              <TabsContent value="service" className="m-0">
                <ScrollArea className="h-[200px]">
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum serviço encontrado
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredServices.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => addItem(service, "service")}
                          className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left"
                        >
                          <span className="text-sm">{service.name}</span>
                          <span className="text-sm font-medium text-amber-500">
                            R$ {service.price.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="product" className="m-0">
                <ScrollArea className="h-[200px]">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addItem(product, "product")}
                          className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Estoque: {product.stock_quantity ?? 0}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-amber-500">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>

      {/* Order Items List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        {orderItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item na comanda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex-shrink-0">
                  {item.item_type === "service" ? (
                    <Scissors className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Package className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {item.unit_price.toFixed(2)} cada
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-semibold">
                    R$ {item.total_price.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Total */}
      <Separator className="my-4" />
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Total da Comanda</span>
        <span className="text-amber-500">R$ {totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}
