"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  Eye,
  PackageCheck,
  Trash2,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  PurchaseOrder,
  Supplier,
  Product,
  PurchaseOrderStatus,
} from "@/types";

export default function PurchaseOrdersPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    supplier_id: "",
    notes: "",
  });

  const [orderItems, setOrderItems] = useState<
    { product_id: string; quantity: number; unit_cost: number }[]
  >([]);

  async function fetchData() {
    const supabase = createClient();

    const [poRes, suppliersRes, productsRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:suppliers(id, name),
          items:purchase_order_items(
            *,
            product:products(id, name, cost_price)
          )
        `,
        )
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false }),
      supabase
        .from("suppliers")
        .select("*")
        .eq("shop_id", shopId)
        .order("name"),
      supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("name"),
    ]);

    setPurchaseOrders((poRes.data as any) || []);
    setSuppliers(suppliersRes.data || []);
    setProducts(productsRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderItems.length === 0) {
      toast.error("Add at least one item to the order");
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

      // Generate PO number
      const { data: poNumber } = await (supabase.rpc as any)(
        "generate_po_number",
        {
          p_shop_id: shopId,
        },
      );

      // Calculate totals
      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0,
      );

      // Create purchase order
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          shop_id: shopId,
          supplier_id: formData.supplier_id,
          po_number: poNumber,
          status: "draft",
          subtotal,
          tax_amount: 0,
          total_amount: subtotal,
          notes: formData.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (poError) {
        toast.error(poError.message);
        return;
      }

      // Create order items
      const items = orderItems.map((item) => ({
        purchase_order_id: po.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.unit_cost,
        total: item.quantity * item.unit_cost,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(items);

      if (itemsError) {
        console.error("Error creating PO items:", itemsError);
      }

      toast.success("Purchase order created!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleReceivePO = async (poId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    // Get PO with items
    const { data: po } = await supabase
      .from("purchase_orders")
      .select(
        `
        *,
        items:purchase_order_items(
          *,
          product:products(id, stock_quantity)
        )
      `,
      )
      .eq("id", poId)
      .single();

    if (!po) {
      toast.error("Purchase order not found");
      return;
    }

    // Update stock for each item
    for (const item of (po as any).items) {
      const product = item.product;
      const quantityToReceive = item.quantity_ordered - item.quantity_received;
      const newStock = product.stock_quantity + quantityToReceive;

      // Update product stock
      await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", item.product_id);

      // Update PO item
      await supabase
        .from("purchase_order_items")
        .update({ quantity_received: item.quantity_ordered })
        .eq("id", item.id);

      // Create stock movement
      await supabase.from("stock_movements").insert({
        shop_id: shopId,
        product_id: item.product_id,
        type: "purchase",
        quantity: quantityToReceive,
        quantity_before: product.stock_quantity,
        quantity_after: newStock,
        reference_type: "purchase_order",
        reference_id: poId,
        created_by: user.id,
      });
    }

    // Update PO status
    await supabase
      .from("purchase_orders")
      .update({ status: "received", received_date: new Date().toISOString() })
      .eq("id", poId);

    toast.success("Stock received successfully!");
    fetchData();
  };

  const handleDeletePO = async (poId: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?"))
      return;

    const supabase = createClient();
    const { error } = await supabase
      .from("purchase_orders")
      .delete()
      .eq("id", poId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Purchase order deleted");
    fetchData();
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      { product_id: "", quantity: 1, unit_cost: 0 },
    ]);
  };

  const updateOrderItem = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill unit cost when product is selected
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_cost = product.cost_price;
      }
    }

    setOrderItems(newItems);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({ supplier_id: "", notes: "" });
    setOrderItems([]);
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch =
      !searchQuery ||
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po as any).supplier?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      ordered:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      partial:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      received:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Purchase Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage stock purchases from suppliers
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Order stock from your suppliers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePO}>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, supplier_id: value })
                      }
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Order Items *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOrderItem}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>

                    {orderItems.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed">
                        No items added. Click "Add Item" to start.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex gap-2 items-end p-3 border rounded-lg"
                          >
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Product</Label>
                              <Select
                                value={item.product_id}
                                onValueChange={(value) =>
                                  updateOrderItem(index, "product_id", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateOrderItem(
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                              />
                            </div>
                            <div className="w-28 space-y-1">
                              <Label className="text-xs">Unit Cost</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  updateOrderItem(
                                    index,
                                    "unit_cost",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOrderItem(index)}
                            >
                              <Minus className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}

                        <div className="text-right font-semibold">
                          Total:{" "}
                          {formatCurrency(
                            orderItems.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.unit_cost,
                              0,
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      placeholder="Optional notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    saving || !formData.supplier_id || orderItems.length === 0
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Order"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
          <CardDescription>
            {filteredPOs.length} order{filteredPOs.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PO number or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No purchase orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      {po.po_number}
                    </TableCell>
                    <TableCell>{(po as any).supplier?.name || "-"}</TableCell>
                    <TableCell>
                      {(po as any).items?.length || 0} items
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(po.total_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(po.status === "draft" ||
                            po.status === "ordered") && (
                            <DropdownMenuItem
                              onClick={() => handleReceivePO(po.id)}
                            >
                              <PackageCheck className="h-4 w-4 mr-2" />
                              Receive Stock
                            </DropdownMenuItem>
                          )}
                          {po.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleDeletePO(po.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
