'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Settings, AlertCircle, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Shop } from '@/types'

export default function ShopSettingsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    name_tamil: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
  })

  useEffect(() => {
    async function fetchShop() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single()

      if (error) {
        setError(error.message)
      } else if (data) {
        setShop(data)
        setFormData({
          name: data.name || '',
          name_tamil: data.name_tamil || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          gstin: data.gstin || '',
        })
      }
      setLoading(false)
    }

    fetchShop()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          name: formData.name,
          name_tamil: formData.name_tamil || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          gstin: formData.gstin || null,
        })
        .eq('id', shopId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      toast.success('Shop settings updated successfully!')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Shop Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your shop&apos;s basic information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
          <CardDescription>
            Update your shop details. These will appear on your bills.
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

            {/* Logo upload placeholder */}
            <div className="space-y-2">
              <Label>Shop Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center">
                  {shop?.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt="Shop logo"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <Button type="button" variant="outline" disabled>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended size: 200x200px. PNG or JPG.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_tamil">Shop Name (Tamil)</Label>
                <Input
                  id="name_tamil"
                  value={formData.name_tamil}
                  onChange={(e) =>
                    setFormData({ ...formData, name_tamil: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                disabled={saving}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                }
                disabled={saving}
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                15-character GST Identification Number
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
