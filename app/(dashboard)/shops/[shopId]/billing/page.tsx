"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cart-store";
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
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Loader2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ShoppingCart,
  Percent,
  Folder,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { BillReceipt } from "@/components/billing/bill-receipt";
import { isDecimalUnit } from "@/lib/utils/unit-helpers";
import type {
  Product,
  PriceType,
  Shop,
  PaymentMethod,
  Bill,
  BillItem,
  Category,
} from "@/types";

export default function BillingPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completedBill, setCompletedBill] = useState<
    (Bill & { items: BillItem[] }) | null
  >(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const searchInputRef = useRef<HTMLDivElement>(null);
  const quantityControlRefs = useRef<
    (HTMLInputElement | HTMLButtonElement | null)[]
  >([]);

  const {
    items,
    priceTypeId,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    discountPercent,
    notes,
    addItem,
    removeItem,
    updateQuantity,
    setPriceTypeId,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
    setPaymentMethod,
    setDiscountPercent,
    setNotes,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getTaxableAmount,
    getGstAmount,
    getTotal,
  } = useCartStore();

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [shopRes, productsRes, priceTypesRes, categoriesRes] =
        await Promise.all([
          supabase.from("shops").select("*").eq("id", shopId).single(),
          supabase
            .from("products")
            .select(
              `
            *,
            category:categories(id, name),
            brand:brands(id, name),
            prices:product_prices(*)
          `
            )
            .eq("shop_id", shopId)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("price_types")
            .select("*")
            .eq("shop_id", shopId)
            .order("is_default", { ascending: false }),
          supabase
            .from("categories")
            .select("*")
            .eq("shop_id", shopId)
            .order("sort_order"),
        ]);

      setShop(shopRes.data);

      if (productsRes.error) {
        setFetchError(productsRes.error.message);
        setProducts([]);
        toast.error("Failed to load products");
      } else {
        setFetchError(null);
        setProducts((productsRes.data as any) || []);
      }

      const priceTypesData = (priceTypesRes.data || []) as PriceType[];
      setPriceTypes(priceTypesData);
      setCategories((categoriesRes.data as Category[]) || []);

      // Set default price type if not set
      const defaultPriceType = priceTypesData.find((pt) => pt.is_default);
      if (defaultPriceType && !priceTypeId) {
        setPriceTypeId(defaultPriceType.id);
      }

      setLoading(false);
    }

    fetchData();
  }, [shopId, priceTypeId, setPriceTypeId]);

  // Focus search/command input when page has finished loading
  useEffect(() => {
    if (!loading) {
      const input = searchInputRef.current?.querySelector("input");
      input?.focus();
    }
  }, [loading]);

  // Global keyboard shortcuts: Cmd+/ or Cmd+Left Arrow focus search, Cmd+Right Arrow focus first cart quantity; Arrow Up/Down between cart quantities
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (
        (mod && !e.shiftKey && e.key === "/") ||
        (mod && e.key === "ArrowLeft")
      ) {
        e.preventDefault();
        e.stopPropagation();
        searchInputRef.current
          ?.querySelector<HTMLInputElement>("input")
          ?.focus();
        return;
      }

      if (mod && e.key === "ArrowRight") {
        if (items.length > 0 && quantityControlRefs.current[0]) {
          e.preventDefault();
          e.stopPropagation();
          quantityControlRefs.current[0].focus();
        }
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const refs = quantityControlRefs.current;
        const i = refs.findIndex((el) => el === document.activeElement);
        if (i === -1) return;
        const next = e.key === "ArrowDown" ? refs[i + 1] : refs[i - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          if (next instanceof HTMLInputElement) next.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [items.length]);

  const getProductPrice = (product: Product): number => {
    if (priceTypeId && product.prices) {
      const specificPrice = product.prices.find(
        (p: any) => p.price_type_id === priceTypeId
      );
      if (specificPrice) {
        return specificPrice.selling_price;
      }
    }
    return product.default_selling_price;
  };

  const handleAddProduct = (product: Product) => {
    const price = getProductPrice(product);
    addItem(product, 1, price);
    toast.success(`Added ${product.name}`);
  };

  const handleSearch = (query: string) => {
    // When user uses arrow keys, cmdk can set the input to the highlighted item's value.
    // Ignore that (don't update searchQuery) so the typed text stays; we only clear on actual select (Enter).
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
        query.trim()
      )
    ) {
      return;
    }

    setSearchQuery(query);

    // If query looks like a barcode (numeric, 8+ chars), try to find exact match
    if (/^\d{8,}$/.test(query)) {
      const product = products.find((p) => p.barcode === query);
      if (product) {
        handleAddProduct(product);
        setSearchQuery("");
      }
    }
  };

  // Search: only used for the suggestion dropdown, not the main grid
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.name_tamil?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.includes(query)
    );
  });

  // Main grid: category drill-down (unchanged by search)
  const parentCategories = categories.filter((c) => !c.parent_id);
  const currentCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;
  const subcategories = selectedCategoryId
    ? categories.filter((c) => c.parent_id === selectedCategoryId)
    : parentCategories;
  const gridProducts = selectedCategoryId
    ? products.filter((p) => p.category_id === selectedCategoryId)
    : products.filter((p) => !p.category_id);
  const showBack = selectedCategoryId != null;
  const handleBack = () =>
    setSelectedCategoryId(currentCategory?.parent_id ?? null);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setProcessing(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Generate bill number
      const { data: billNumber } = await (supabase.rpc as any)(
        "generate_bill_number",
        {
          p_shop_id: shopId,
        }
      );

      // Create bill
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          shop_id: shopId,
          bill_number: billNumber,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          price_type_id: priceTypeId || null,
          subtotal: getSubtotal(),
          discount_amount: getDiscountAmount(),
          discount_percent: discountPercent,
          taxable_amount: getTaxableAmount(),
          gst_amount: getGstAmount(),
          total: getTotal(),
          payment_method: paymentMethod,
          payment_status: "paid",
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (billError) {
        toast.error(billError.message);
        return;
      }

      // Create bill items
      const billItems = items.map((item) => ({
        bill_id: bill.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_name_tamil: item.product.name_tamil,
        sku: item.product.sku,
        hsn_code: item.product.hsn_code,
        quantity: item.quantity,
        unit: item.product.unit,
        unit_price: item.unit_price,
        discount_amount: 0,
        taxable_amount:
          item.quantity * item.unit_price * (1 - discountPercent / 100),
        gst_percent: item.product.gst_percent,
        gst_amount: item.gst_amount * (1 - discountPercent / 100),
        total: item.total * (1 - discountPercent / 100),
      }));

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(billItems);

      if (itemsError) {
        console.error("Error creating bill items:", itemsError);
      }

      // Update stock quantities and create stock movements (only for products with inventory tracking)
      for (const item of items) {
        if (item.product.track_inventory) {
          const newQuantity = item.product.stock_quantity - item.quantity;

          await supabase
            .from("products")
            .update({ stock_quantity: newQuantity })
            .eq("id", item.product.id);

          await supabase.from("stock_movements").insert({
            shop_id: shopId,
            product_id: item.product.id,
            type: "sale",
            quantity: -item.quantity,
            quantity_before: item.product.stock_quantity,
            quantity_after: newQuantity,
            reference_type: "bill",
            reference_id: bill.id,
            created_by: user.id,
          });
        }
      }

      // Fetch complete bill with items
      const { data: completeBill } = await supabase
        .from("bills")
        .select(
          `
          *,
          items:bill_items(*)
        `
        )
        .eq("id", bill.id)
        .single();

      setCompletedBill(completeBill as any);
      setShowReceipt(true);
      setCheckoutDialogOpen(false);
      clearCart();
      toast.success("Bill created successfully!");

      // Refresh products to update stock
      const { data: updatedProducts } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name),
          brand:brands(id, name),
          prices:product_prices(*)
        `
        )
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("name");

      setProducts((updatedProducts as any) || []);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const paymentMethods: {
    value: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "cash", label: "Cash", icon: <Banknote className="w-4 h-4" /> },
    { value: "card", label: "Card", icon: <CreditCard className="w-4 h-4" /> },
    { value: "upi", label: "UPI", icon: <Smartphone className="w-4 h-4" /> },
    { value: "credit", label: "Credit", icon: <User className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col border-r min-h-0">
          {/* Search Bar - Command + Popover combobox for keyboard product selection */}
          <div className="p-4 border-b bg-background space-y-2">
            <div className="flex gap-4 items-center">
              <div ref={searchInputRef} className="relative flex-1">
                <Command
                  value={searchQuery}
                  onValueChange={handleSearch}
                  shouldFilter={false}
                  className="rounded-md border overflow-hidden"
                >
                  <Popover
                    open={popoverOpen}
                    onOpenChange={(open) => {
                      setPopoverOpen(open);
                      if (!open) setSearchQuery("");
                    }}
                  >
                    <PopoverAnchor asChild>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <Input
                          placeholder="Search products or scan barcode..."
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          onFocus={() => setPopoverOpen(true)}
                          className="pl-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 bg-transparent"
                        />
                        <span className="sr-only">
                          ↑↓ to select, Enter to add
                        </span>
                        <span className="sr-only">
                          Cmd+/ or Cmd+Left Arrow focus search, Cmd+Right Arrow
                          focus first cart quantity
                        </span>
                      </div>
                    </PopoverAnchor>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>
                          {fetchError
                            ? "Failed to load products."
                            : searchQuery
                            ? "No matching products."
                            : "No products in this shop."}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((product) => {
                            const price = getProductPrice(product);
                            const isOutOfStock =
                              product.track_inventory &&
                              product.stock_quantity <= 0;
                            return (
                              <CommandItem
                                key={product.id}
                                value={`${product.id} ${product.name} ${
                                  product.name_tamil ?? ""
                                } ${product.sku ?? ""} ${
                                  product.barcode ?? ""
                                }`}
                                disabled={isOutOfStock}
                                onSelect={() => {
                                  if (!isOutOfStock) {
                                    handleAddProduct(product);
                                    setSearchQuery("");
                                  }
                                }}
                                className="flex flex-col items-start gap-0.5 py-2"
                              >
                                <span className="font-medium">
                                  {product.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(price)}/{product.unit}
                                  {product.track_inventory &&
                                    ` · Stock: ${product.stock_quantity}`}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </PopoverContent>
                  </Popover>
                </Command>
              </div>
              <Select value={priceTypeId || ""} onValueChange={setPriceTypeId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Price Type" />
                </SelectTrigger>
                <SelectContent>
                  {priceTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name} {pt.is_default && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] ml-0.5">
                /
              </kbd>
              {" or "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] ml-0.5">
                ←
              </kbd>
              {" search · "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘
              </kbd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] ml-0.5">
                →
              </kbd>
              {" cart · "}
              <span>↑↓ select, Enter add</span>
            </p>
          </div>

          {/* Main product area: category drill-down (not filtered by search) */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 -ml-1"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to{" "}
                  {currentCategory?.parent_id ? "parent" : "all categories"}
                </Button>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {/* Category cards: navigate into category */}
                {subcategories.map((category) => (
                  <Card
                    key={category.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-dashed"
                    onClick={() => setSelectedCategoryId(category.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCategoryId(category.id);
                      }
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                      <Folder className="w-8 h-8 text-muted-foreground" />
                      <p className="font-medium text-sm text-center line-clamp-2">
                        {category.name}
                      </p>
                      {category.name_tamil && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {category.name_tamil}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Product cards */}
                {gridProducts.map((product) => {
                  const price = getProductPrice(product);
                  const inCart = items.find(
                    (item) => item.product.id === product.id
                  );
                  const isLowStock =
                    product.track_inventory &&
                    product.stock_quantity <= product.low_stock_threshold;
                  const isOutOfStock =
                    product.track_inventory && product.stock_quantity <= 0;

                  return (
                    <Card
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        inCart ? "border-primary ring-1 ring-primary" : ""
                      } ${isOutOfStock ? "opacity-50" : ""}`}
                      onClick={() => !isOutOfStock && handleAddProduct(product)}
                      onKeyDown={(e) => {
                        if (isOutOfStock) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleAddProduct(product);
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-1">
                          <p className="font-medium text-sm line-clamp-2">
                            {product.name}
                          </p>
                          {product.name_tamil && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {product.name_tamil}
                            </p>
                          )}
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(price)}
                            <span className="text-xs font-normal text-muted-foreground">
                              /{product.unit}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {product.track_inventory ? (
                            <span
                              className={`text-xs ${
                                isLowStock
                                  ? "text-warning"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Stock: {product.stock_quantity}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {product.unit}
                            </span>
                          )}
                          {inCart && (
                            <Badge variant="secondary" className="text-xs">
                              {inCart.quantity} in cart
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {subcategories.length === 0 && gridProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  {fetchError ? (
                    <p className="text-destructive mb-2">{fetchError}</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-2">
                        {selectedCategoryId
                          ? "No subcategories or products in this category."
                          : "No categories or uncategorized products yet."}
                      </p>
                      {!selectedCategoryId && (
                        <Link
                          href={`/shops/${shopId}/products`}
                          className="text-primary underline underline-offset-4 hover:no-underline text-sm font-medium"
                        >
                          Add products
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Panel */}
        <div className="w-96 flex flex-col bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({items.length})
              </h2>
              {items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product.name}
                      </p>
                      {item.product.name_tamil && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.product.name_tamil}
                        </p>
                      )}
                      <p className="text-sm text-primary font-medium mt-1">
                        {formatCurrency(item.unit_price)}/{item.product.unit} ×{" "}
                        {item.quantity}
                        {item.product.unit}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </p>
                      <div className="flex items-center gap-1">
                        {isDecimalUnit(item.product.unit) ? (
                          // Decimal input for weight/volume products
                          <>
                            <Input
                              ref={(el) => {
                                quantityControlRefs.current[index] = el;
                              }}
                              key={`${item.product.id}-${item.quantity}`}
                              type="number"
                              step="0.01"
                              min="0.01"
                              defaultValue={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value > 0) {
                                  updateQuantity(item.product.id, value);
                                } else {
                                  // Reset to previous value if invalid
                                  e.target.value = String(item.quantity);
                                }
                              }}
                              className="w-16 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-muted-foreground min-w-[24px]">
                              {item.product.unit}
                            </span>
                          </>
                        ) : (
                          // +/- buttons for count-based products
                          <>
                            <Button
                              ref={(el) => {
                                quantityControlRefs.current[index] = el;
                              }}
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1
                                )
                              }
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                item.product.track_inventory &&
                                item.quantity >= item.product.stock_quantity
                              }
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Cart Summary */}
          {items.length > 0 && (
            <div className="p-4 border-t space-y-4">
              {/* Discount */}
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Discount %"
                  value={discountPercent || ""}
                  onChange={(e) =>
                    setDiscountPercent(parseFloat(e.target.value) || 0)
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(getSubtotal())}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-{formatCurrency(getDiscountAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST</span>
                  <span>{formatCurrency(getGstAmount())}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(getTotal())}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-lg gap-2"
                onClick={() => setCheckoutDialogOpen(true)}
              >
                <Receipt className="w-5 h-5" />
                Checkout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Enter customer details and select payment method
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="+91 98765 43210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    type="button"
                    variant={
                      paymentMethod === method.value ? "default" : "outline"
                    }
                    className="justify-start gap-2"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    {method.icon}
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency(getDiscountAmount())}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>{formatCurrency(getGstAmount())}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(getTotal())}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt className="mr-2 h-4 w-4" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {completedBill && shop && (
        <BillReceipt
          bill={completedBill}
          shop={shop}
          open={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setCompletedBill(null);
          }}
        />
      )}
    </>
  );
}
