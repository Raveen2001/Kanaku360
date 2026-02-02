'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, Store, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewShopPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    name_tamil: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to create a shop')
        return
      }

      // Ensure profile exists (for users who signed up before migration)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          })

        if (profileError) {
          setError('Failed to create user profile: ' + profileError.message)
          return
        }
      }

      const { data: shop, error: insertError } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name: formData.name,
          name_tamil: formData.name_tamil || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          gstin: formData.gstin || null,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Create default price type for the shop
      await supabase.from('price_types').insert({
        shop_id: shop.id,
        name: 'Retail',
        description: 'Default retail price',
        is_default: true,
      })

      toast.success('Shop created successfully!')
      router.push(`/shops/${shop.id}`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create New Shop</CardTitle>
            <CardDescription>
              Set up your shop details. You can always update these later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Shop Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Store"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_tamil">Shop Name (Tamil)</Label>
                  <Input
                    id="name_tamil"
                    placeholder="என் கடை"
                    value={formData.name_tamil}
                    onChange={(e) =>
                      setFormData({ ...formData, name_tamil: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="123 Main Street, City"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="shop@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                  }
                  disabled={loading}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  15-character GST Identification Number (optional)
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Shop'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
