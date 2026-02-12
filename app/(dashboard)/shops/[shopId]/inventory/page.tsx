"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Loader2,
  Search,
  AlertTriangle,
  Plus,
  Minus,
  ArrowUpDown,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { Product, StockMovement, StockMovementType } from "@/types";

export default function InventoryPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [adjustmentData, setAdjustmentData] = useState({
    type: "adjustment" as "adjustment" | "return",
    quantity: "",
    notes: "",
  });

  async function fetchData() {
    const supabase = createClient();

    const [productsRes, movementsRes] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("track_inventory", true)
        .order("name"),
      supabase
        .from("stock_movements")
        .select(
          `
          *,
          product:products(id, name)
        `,
        )
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    setProducts(productsRes.data || []);
    setMovements((movementsRes.data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) return;

    const quantity = parseFloat(adjustmentData.quantity);
    if (isNaN(quantity) || quantity === 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const newStock = selectedProduct.stock_quantity + quantity;

      if (newStock < 0) {
        toast.error("Stock cannot be negative");
        setSaving(false);
        return;
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", selectedProduct.id);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      // Create stock movement
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          shop_id: shopId,
          product_id: selectedProduct.id,
          type: adjustmentData.type,
          quantity,
          quantity_before: selectedProduct.stock_quantity,
          quantity_after: newStock,
          reference_type: "adjustment",
          notes: adjustmentData.notes || null,
          created_by: user.id,
        });

      if (movementError) {
        console.error("Error creating movement:", movementError);
      }

      toast.success("Stock adjusted successfully!");
      setAdjustDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentData({ type: "adjustment", quantity: "", notes: "" });
      fetchData();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const openAdjustDialog = (product: Product) => {
    setSelectedProduct(product);
    setAdjustDialogOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      stockFilter === "all" ||
      (stockFilter === "low" &&
        product.stock_quantity <= product.low_stock_threshold) ||
      (stockFilter === "out" && product.stock_quantity <= 0) ||
      (stockFilter === "ok" &&
        product.stock_quantity > product.low_stock_threshold);

    return matchesSearch && matchesFilter;
  });

  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0,
  ).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity <= 0).length;
  const totalValue = products.reduce(
    (sum, p) => sum + p.stock_quantity * p.cost_price,
    0,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMovementTypeBadge = (type: StockMovementType) => {
    const variants: Record<
      string,
      { className: string; icon: React.ReactNode }
    > = {
      purchase: {
        className:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: <Plus className="w-3 h-3 mr-1" />,
      },
      sale: {
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <Minus className="w-3 h-3 mr-1" />,
      },
      adjustment: {
        className:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        icon: <ArrowUpDown className="w-3 h-3 mr-1" />,
      },
      return: {
        className:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        icon: <ArrowUpDown className="w-3 h-3 mr-1" />,
      },
    };
    const variant = variants[type];
    return (
      <Badge className={variant.className}>
        {variant.icon}
        {type.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your stock levels
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {outOfStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                Current inventory of all products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="ok">In Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const isLowStock =
                        product.stock_quantity <= product.low_stock_threshold &&
                        product.stock_quantity > 0;
                      const isOutOfStock = product.stock_quantity <= 0;

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.name_tamil && (
                                <p className="text-sm text-muted-foreground">
                                  {product.name_tamil}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.sku || "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span
                              className={
                                isOutOfStock
                                  ? "text-destructive"
                                  : isLowStock
                                  ? "text-warning"
                                  : ""
                              }
                            >
                              {product.stock_quantity}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {product.unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {product.low_stock_threshold}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              product.stock_quantity * product.cost_price,
                            )}
                          </TableCell>
                          <TableCell>
                            {isOutOfStock ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-warning/10 text-warning">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustDialog(product)}
                            >
                              Adjust
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Stock Movement History
              </CardTitle>
              <CardDescription>
                Recent stock changes (last 100 movements)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No stock movements yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(movement as any).product?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {getMovementTypeBadge(movement.type)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {movement.quantity_before}
                        </TableCell>
                        <TableCell className="text-right">
                          {movement.quantity_after}
                        </TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-xs">
                          {movement.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock}>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">
                  {selectedProduct?.stock_quantity} {selectedProduct?.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select
                  value={adjustmentData.type}
                  onValueChange={(value: "adjustment" | "return") =>
                    setAdjustmentData({ ...adjustmentData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity Change (positive to add, negative to remove)
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="e.g., 10 or -5"
                  value={adjustmentData.quantity}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      quantity: e.target.value,
                    })
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reason / Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Damaged goods, Physical count correction"
                  value={adjustmentData.notes}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      notes: e.target.value,
                    })
                  }
                  disabled={saving}
                  rows={2}
                />
              </div>

              {adjustmentData.quantity && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">New Stock</p>
                  <p className="text-2xl font-bold">
                    {(selectedProduct?.stock_quantity || 0) +
                      (parseFloat(adjustmentData.quantity) || 0)}{" "}
                    {selectedProduct?.unit}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdjustDialogOpen(false);
                  setSelectedProduct(null);
                  setAdjustmentData({
                    type: "adjustment",
                    quantity: "",
                    notes: "",
                  });
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Adjust Stock"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
