'use client'

import { useState, useEffect, useRef, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { BillReceipt } from '@/components/billing/bill-receipt'
import type { Product, PriceType, Shop, PaymentMethod, Bill, BillItem } from '@/types'

export default function BillingPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [products, setProducts] = useState<Product[]>([])
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [completedBill, setCompletedBill] = useState<(Bill & { items: BillItem[] }) | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)

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
  } = useCartStore()

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      const [shopRes, productsRes, priceTypesRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).single(),
        supabase
          .from('products')
          .select(`
            *,
            category:categories(id, name),
            brand:brands(id, name),
            prices:product_prices(*)
          `)
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('price_types')
          .select('*')
          .eq('shop_id', shopId)
          .order('is_default', { ascending: false }),
      ])

      setShop(shopRes.data)
      setProducts((productsRes.data as any) || [])
      const priceTypesData = (priceTypesRes.data || []) as PriceType[]
      setPriceTypes(priceTypesData)

      // Set default price type if not set
      const defaultPriceType = priceTypesData.find(pt => pt.is_default)
      if (defaultPriceType && !priceTypeId) {
        setPriceTypeId(defaultPriceType.id)
      }

      setLoading(false)
    }

    fetchData()
    searchInputRef.current?.focus()
  }, [shopId, priceTypeId, setPriceTypeId])

  const getProductPrice = (product: Product): number => {
    if (priceTypeId && product.prices) {
      const specificPrice = product.prices.find(
        (p: any) => p.price_type_id === priceTypeId
      )
      if (specificPrice) {
        return specificPrice.selling_price
      }
    }
    return product.default_selling_price
  }

  const handleAddProduct = (product: Product) => {
    const price = getProductPrice(product)
    addItem(product, 1, price)
    toast.success(`Added ${product.name}`)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    // If query looks like a barcode (numeric, 8+ chars), try to find exact match
    if (/^\d{8,}$/.test(query)) {
      const product = products.find(p => p.barcode === query)
      if (product) {
        handleAddProduct(product)
        setSearchQuery('')
      }
    }
  }

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      product.name_tamil?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.includes(query)
    )
  })

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    setProcessing(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in')
        return
      }

      // Generate bill number
      const { data: billNumber } = await (supabase.rpc as any)('generate_bill_number', {
        p_shop_id: shopId,
      })

      // Create bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
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
          payment_status: 'paid',
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (billError) {
        toast.error(billError.message)
        return
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
        taxable_amount: item.quantity * item.unit_price * (1 - discountPercent / 100),
        gst_percent: item.product.gst_percent,
        gst_amount: item.gst_amount * (1 - discountPercent / 100),
        total: item.total * (1 - discountPercent / 100),
      }))

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems)

      if (itemsError) {
        console.error('Error creating bill items:', itemsError)
      }

      // Update stock quantities and create stock movements
      for (const item of items) {
        const newQuantity = item.product.stock_quantity - item.quantity
        
        await supabase
          .from('products')
          .update({ stock_quantity: newQuantity })
          .eq('id', item.product.id)

        await supabase.from('stock_movements').insert({
          shop_id: shopId,
          product_id: item.product.id,
          type: 'sale',
          quantity: -item.quantity,
          quantity_before: item.product.stock_quantity,
          quantity_after: newQuantity,
          reference_type: 'bill',
          reference_id: bill.id,
          created_by: user.id,
        })
      }

      // Fetch complete bill with items
      const { data: completeBill } = await supabase
        .from('bills')
        .select(`
          *,
          items:bill_items(*)
        `)
        .eq('id', bill.id)
        .single()

      setCompletedBill(completeBill as any)
      setShowReceipt(true)
      setCheckoutDialogOpen(false)
      clearCart()
      toast.success('Bill created successfully!')

      // Refresh products to update stock
      const { data: updatedProducts } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          brand:brands(id, name),
          prices:product_prices(*)
        `)
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name')

      setProducts((updatedProducts as any) || [])
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4" /> },
    { value: 'credit', label: 'Credit', icon: <User className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col border-r">
          {/* Search Bar */}
          <div className="p-4 border-b bg-background">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products or scan barcode..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={priceTypeId || ''} onValueChange={setPriceTypeId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Price Type" />
                </SelectTrigger>
                <SelectContent>
                  {priceTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name} {pt.is_default && '(Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const price = getProductPrice(product)
                const inCart = items.find((item) => item.product.id === product.id)
                const isLowStock = product.stock_quantity <= product.low_stock_threshold
                
                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:border-primary/50 transition-all ${
                      inCart ? 'border-primary ring-1 ring-primary' : ''
                    } ${product.stock_quantity <= 0 ? 'opacity-50' : ''}`}
                    onClick={() => product.stock_quantity > 0 && handleAddProduct(product)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                        {product.name_tamil && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.name_tamil}
                          </p>
                        )}
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(price)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isLowStock ? 'text-warning' : 'text-muted-foreground'}`}>
                            Stock: {product.stock_quantity}
                          </span>
                          {inCart && (
                            <Badge variant="secondary" className="text-xs">
                              {inCart.quantity} in cart
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No products found
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
                items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      {item.product.name_tamil && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.product.name_tamil}
                        </p>
                      )}
                      <p className="text-sm text-primary font-medium mt-1">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock_quantity}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
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
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
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
                  <span className="text-primary">{formatCurrency(getTotal())}</span>
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
                    variant={paymentMethod === method.value ? 'default' : 'outline'}
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
                <span className="text-primary">{formatCurrency(getTotal())}</span>
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
            setShowReceipt(false)
            setCompletedBill(null)
          }}
        />
      )}
    </>
  )
}
