"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Package,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Product, Category, Brand } from "@/types";

export default function ProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  async function fetchData() {
    const supabase = createClient();

    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
      supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name),
          brand:brands(id, name)
        `,
        )
        .eq("shop_id", shopId)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("shop_id", shopId)
        .order("name"),
      supabase
        .from("brands")
        .select("id, name")
        .eq("shop_id", shopId)
        .order("name"),
    ]);

    setProducts((productsRes.data as any) || []);
    setCategories((categoriesRes.data as any) || []);
    setBrands((brandsRes.data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Product deleted");
    fetchData();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isActive ? "Product deactivated" : "Product activated");
    fetchData();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name_tamil?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;

    const matchesBrand =
      brandFilter === "all" || product.brand_id === brandFilter;

    return matchesSearch && matchesCategory && matchesBrand;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Products
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog
          </p>
        </div>
        <Link href={`/shops/${shopId}/products/new`}>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {filteredProducts.length} of {products.length} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
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
              {products.length === 0 && (
                <p className="text-sm">Add your first product to get started</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category / Brand</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.name_tamil && (
                            <p className="text-sm text-muted-foreground">
                              {product.name_tamil}
                            </p>
                          )}
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{product.category?.name || "-"}</p>
                          <p className="text-muted-foreground">
                            {product.brand?.name || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.mrp)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.default_selling_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.track_inventory ? (
                          <div className="flex items-center justify-end gap-2">
                            {product.stock_quantity <=
                              product.low_stock_threshold && (
                              <AlertTriangle className="w-4 h-4 text-warning" />
                            )}
                            <span
                              className={
                                product.stock_quantity <=
                                product.low_stock_threshold
                                  ? "text-warning font-medium"
                                  : ""
                              }
                            >
                              {product.stock_quantity} {product.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not tracked
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/shops/${shopId}/products/${product.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/shops/${shopId}/products/${product.id}/edit`}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleActive(
                                  product.id,
                                  product.is_active,
                                )
                              }
                            >
                              {product.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
