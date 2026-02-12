"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, AlertCircle, Save, Package } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  Product,
  Category,
  Brand,
  PriceType,
  ProductPrice,
} from "@/types";

interface ProductFormProps {
  shopId: string;
  product?: Product;
  productPrices?: ProductPrice[];
}

export function ProductForm({
  shopId,
  product,
  productPrices = [],
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

  const [formData, setFormData] = useState({
    name: product?.name || "",
    name_tamil: product?.name_tamil || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    description: product?.description || "",
    category_id: product?.category_id || "",
    brand_id: product?.brand_id || "",
    mrp: product?.mrp?.toString() || "",
    cost_price: product?.cost_price?.toString() || "",
    default_selling_price: product?.default_selling_price?.toString() || "",
    gst_percent: product?.gst_percent?.toString() || "0",
    hsn_code: product?.hsn_code || "",
    unit: product?.unit || "pcs",
    track_inventory: product?.track_inventory ?? false,
    stock_quantity: product?.stock_quantity?.toString() || "0",
    low_stock_threshold: product?.low_stock_threshold?.toString() || "10",
    is_active: product?.is_active ?? true,
  });

  // Initialize prices from productPrices only once
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initialPrices: Record<string, string> = {};
    productPrices.forEach((pp) => {
      initialPrices[pp.price_type_id] = pp.selling_price.toString();
    });
    return initialPrices;
  });

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [categoriesRes, brandsRes, priceTypesRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("shop_id", shopId)
          .order("name"),
        supabase.from("brands").select("*").eq("shop_id", shopId).order("name"),
        supabase
          .from("price_types")
          .select("*")
          .eq("shop_id", shopId)
          .order("is_default", { ascending: false })
          .order("name"),
      ]);

      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
      setPriceTypes(priceTypesRes.data || []);

      setLoading(false);
    }

    fetchData();
  }, [shopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();

      const productData = {
        shop_id: shopId,
        name: formData.name,
        name_tamil: formData.name_tamil || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        mrp: parseFloat(formData.mrp) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        default_selling_price: parseFloat(formData.default_selling_price) || 0,
        gst_percent: parseFloat(formData.gst_percent) || 0,
        hsn_code: formData.hsn_code || null,
        unit: formData.unit,
        track_inventory: formData.track_inventory,
        stock_quantity: formData.track_inventory
          ? parseFloat(formData.stock_quantity) || 0
          : 0,
        low_stock_threshold: formData.track_inventory
          ? parseFloat(formData.low_stock_threshold) || 10
          : 0,
        is_active: formData.is_active,
      };

      let productId = product?.id;

      if (product) {
        // Update existing product
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return;
        }

        productId = newProduct.id;
      }

      // Update product prices
      if (productId) {
        // Delete existing prices
        await supabase
          .from("product_prices")
          .delete()
          .eq("product_id", productId);

        // Insert new prices
        const pricesToInsert = Object.entries(prices)
          .filter(([, price]) => price && parseFloat(price) > 0)
          .map(([priceTypeId, price]) => ({
            product_id: productId,
            price_type_id: priceTypeId,
            selling_price: parseFloat(price),
          }));

        if (pricesToInsert.length > 0) {
          const { error: pricesError } = await supabase
            .from("product_prices")
            .insert(pricesToInsert);

          if (pricesError) {
            console.error("Error saving prices:", pricesError);
          }
        }
      }

      toast.success(product ? "Product updated!" : "Product created!");
      router.push(`/shops/${shopId}/products`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const gstOptions = ["0", "5", "12", "18", "28"];
  const unitOptions = [
    "pcs",
    "kg",
    "g",
    "l",
    "ml",
    "box",
    "pack",
    "set",
    "pair",
    "dozen",
  ];

  return (
    <div className="p-6 max-w-4xl">
      <Link
        href={`/shops/${shopId}/products`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" />
          {product ? "Edit Product" : "Add Product"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {product
            ? "Update product details"
            : "Add a new product to your catalog"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Product name and identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Samsung Galaxy S24"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_tamil">Product Name (Tamil)</Label>
                <Input
                  id="name_tamil"
                  placeholder="தமிழில் பெயர்"
                  value={formData.name_tamil}
                  onChange={(e) =>
                    setFormData({ ...formData, name_tamil: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="e.g., SAM-S24-BLK"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="e.g., 8901234567890"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief product description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={saving}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category_id: value === "none" ? "" : value,
                    })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={formData.brand_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      brand_id: value === "none" ? "" : value,
                    })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Set product prices and tax information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP (₹) *</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.mrp}
                  onChange={(e) =>
                    setFormData({ ...formData, mrp: e.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price (₹) *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_price: e.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_selling_price">
                  Default Selling Price (₹) *
                </Label>
                <Input
                  id="default_selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.default_selling_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_selling_price: e.target.value,
                    })
                  }
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gst_percent">GST %</Label>
                <Select
                  value={formData.gst_percent}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gst_percent: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gstOptions.map((gst) => (
                      <SelectItem key={gst} value={gst}>
                        {gst}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  placeholder="e.g., 8517"
                  value={formData.hsn_code}
                  onChange={(e) =>
                    setFormData({ ...formData, hsn_code: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {priceTypes.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-base">Price Types</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set specific prices for different customer types. Leave
                    empty to use default price.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {priceTypes.map((pt) => (
                      <div key={pt.id} className="space-y-2">
                        <Label htmlFor={`price-${pt.id}`}>
                          {pt.name} {pt.is_default && "(Default)"}
                        </Label>
                        <Input
                          id={`price-${pt.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={
                            pt.is_default
                              ? formData.default_selling_price || "0.00"
                              : "Use default"
                          }
                          value={prices[pt.id] || ""}
                          onChange={(e) =>
                            setPrices({ ...prices, [pt.id]: e.target.value })
                          }
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Stock and unit information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Track Inventory</Label>
                <p className="text-sm text-muted-foreground">
                  Enable stock tracking for this product
                </p>
              </div>
              <Switch
                checked={formData.track_inventory}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, track_inventory: checked })
                }
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.track_inventory && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={formData.stock_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock_quantity: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="10"
                      value={formData.low_stock_threshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          low_stock_threshold: e.target.value,
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Product</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive products won&apos;t appear in billing
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {product ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {product ? "Update Product" : "Create Product"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
