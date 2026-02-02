import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Receipt,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  ShoppingCart,
  Boxes,
} from 'lucide-react'

export default async function ShopDashboardPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = await params
  const supabase = await createClient()

  // Get shop details
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single()

  // Get today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayBills } = await supabase
    .from('bills')
    .select('total')
    .eq('shop_id', shopId)
    .gte('created_at', today.toISOString())

  const todaySales = todayBills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0
  const todayBillCount = todayBills?.length || 0

  // Get this month's stats
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const { data: monthBills } = await supabase
    .from('bills')
    .select('total')
    .eq('shop_id', shopId)
    .gte('created_at', monthStart.toISOString())

  const monthSales = monthBills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0
  const monthBillCount = monthBills?.length || 0

  // Get low stock products
  const { data: lowStockProducts, count: lowStockCount } = await supabase
    .from('products')
    .select('id, name, stock_quantity, low_stock_threshold', { count: 'exact' })
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .filter('stock_quantity', 'lte', 'low_stock_threshold')
    .limit(5)

  // Get total products
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)

  // Get recent bills
  const { data: recentBills } = await supabase
    .from('bills')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(5)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{shop?.name}</h1>
          {shop?.name_tamil && (
            <p className="text-muted-foreground">{shop.name_tamil}</p>
          )}
        </div>
        <Link href={`/shops/${shopId}/billing`}>
          <Button size="lg" className="gap-2">
            <Receipt className="w-4 h-4" />
            New Bill
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Sales
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todaySales)}</div>
            <p className="text-xs text-muted-foreground">
              {todayBillCount} bill{todayBillCount !== 1 ? 's' : ''} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthSales)}</div>
            <p className="text-xs text-muted-foreground">
              {monthBillCount} bills this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active products in catalog
            </p>
          </CardContent>
        </Card>

        <Card className={lowStockCount && lowStockCount > 0 ? 'border-warning' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alert
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockCount && lowStockCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Products need restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Low Stock Products</CardTitle>
            <Link href={`/shops/${shopId}/inventory`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Threshold: {product.low_stock_threshold}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-warning">
                        {product.stock_quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>All products are well stocked!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Bills</CardTitle>
            <Link href={`/shops/${shopId}/bills`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentBills && recentBills.length > 0 ? (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{bill.bill_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {bill.customer_name || 'Walk-in Customer'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(bill.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bill.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No bills yet today</p>
                <Link href={`/shops/${shopId}/billing`}>
                  <Button variant="link" className="mt-2">
                    Create your first bill
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Link href={`/shops/${shopId}/billing`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Receipt className="w-5 h-5" />
                <span>New Bill</span>
              </Button>
            </Link>
            <Link href={`/shops/${shopId}/products`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Package className="w-5 h-5" />
                <span>Add Product</span>
              </Button>
            </Link>
            <Link href={`/shops/${shopId}/purchase-orders`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Boxes className="w-5 h-5" />
                <span>New Purchase</span>
              </Button>
            </Link>
            <Link href={`/shops/${shopId}/bills`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>View Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
