import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Plus, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's shops (owned or employee)
  const { data: ownedShops } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: employeeShops } = await supabase
    .from('shop_employees')
    .select('shop:shops(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const shops = [
    ...(ownedShops || []),
    ...((employeeShops as any[])?.map((e) => e.shop).filter(Boolean) || []),
  ]

  // If user has exactly one shop, redirect to it
  if (shops.length === 1) {
    redirect(`/shops/${shops[0].id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome to Kanaku360</h1>
          <p className="text-muted-foreground mt-2">
            Select a shop to get started or create a new one
          </p>
        </div>

        {shops.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No shops yet</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Create your first shop to start managing products, billing, and inventory.
              </p>
              <Link href="/shops/new">
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Shop
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Shops</h2>
              <Link href="/shops/new">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Shop
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {shops.map((shop) => (
                <Link key={shop.id} href={`/shops/${shop.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="mt-4">{shop.name}</CardTitle>
                      {shop.name_tamil && (
                        <CardDescription className="text-base">
                          {shop.name_tamil}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {shop.address && <p>{shop.address}</p>}
                        {shop.phone && <p>{shop.phone}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
