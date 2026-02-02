'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DollarSign, Plus, Loader2, MoreHorizontal, Pencil, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { PriceType } from '@/types'

export default function PriceTypesPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPriceType, setEditingPriceType] = useState<PriceType | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
  })

  async function fetchPriceTypes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('price_types')
      .select('*')
      .eq('shop_id', shopId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    setPriceTypes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPriceTypes()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()

      if (editingPriceType) {
        const { error } = await supabase
          .from('price_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_default: formData.is_default,
          })
          .eq('id', editingPriceType.id)

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Price type updated!')
      } else {
        const { error } = await supabase.from('price_types').insert({
          shop_id: shopId,
          name: formData.name,
          description: formData.description || null,
          is_default: formData.is_default,
        })

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Price type created!')
      }

      setDialogOpen(false)
      resetForm()
      fetchPriceTypes()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (priceType: PriceType) => {
    setEditingPriceType(priceType)
    setFormData({
      name: priceType.name,
      description: priceType.description || '',
      is_default: priceType.is_default,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const priceType = priceTypes.find(p => p.id === id)
    if (priceType?.is_default) {
      toast.error('Cannot delete the default price type')
      return
    }
    
    if (!confirm('Are you sure you want to delete this price type?')) return

    const supabase = createClient()
    const { error } = await supabase.from('price_types').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Price type deleted')
    fetchPriceTypes()
  }

  const handleSetDefault = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('price_types')
      .update({ is_default: true })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Default price type updated')
    fetchPriceTypes()
  }

  const resetForm = () => {
    setEditingPriceType(null)
    setFormData({ name: '', description: '', is_default: false })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Price Types
          </h1>
          <p className="text-muted-foreground mt-1">
            Define different pricing tiers for your products
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Price Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPriceType ? 'Edit Price Type' : 'Add Price Type'}
              </DialogTitle>
              <DialogDescription>
                {editingPriceType
                  ? 'Update the price type details'
                  : 'Create a new pricing tier (e.g., Retail, Wholesale, Dealer)'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Price Type Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Wholesale"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this price type"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    disabled={saving}
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Default Price Type</Label>
                    <p className="text-sm text-muted-foreground">
                      Used when no specific price is set for a product
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_default: checked })
                    }
                    disabled={saving}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingPriceType ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingPriceType ? (
                    'Update Price Type'
                  ) : (
                    'Create Price Type'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Price Types</CardTitle>
          <CardDescription>
            Each product can have different prices for each type. The default price is used when a specific price isn&apos;t set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : priceTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No price types yet</p>
              <p className="text-sm">Add price types like Retail, Wholesale, Dealer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceTypes.map((priceType) => (
                  <TableRow key={priceType.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {priceType.name}
                        {priceType.is_default && (
                          <Star className="w-4 h-4 text-primary fill-primary" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {priceType.description || '-'}
                    </TableCell>
                    <TableCell>
                      {priceType.is_default ? (
                        <Badge className="bg-primary/10 text-primary">Default</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(priceType)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!priceType.is_default && (
                            <DropdownMenuItem onClick={() => handleSetDefault(priceType.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          {!priceType.is_default && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(priceType.id)}
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
  )
}
