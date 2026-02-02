'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tag, Plus, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Brand } from '@/types'

export default function BrandsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    name_tamil: '',
  })

  async function fetchBrands() {
    const supabase = createClient()
    const { data } = await supabase
      .from('brands')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true })

    setBrands(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBrands()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({
            name: formData.name,
            name_tamil: formData.name_tamil || null,
          })
          .eq('id', editingBrand.id)

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Brand updated!')
      } else {
        const { error } = await supabase.from('brands').insert({
          shop_id: shopId,
          name: formData.name,
          name_tamil: formData.name_tamil || null,
        })

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Brand created!')
      }

      setDialogOpen(false)
      resetForm()
      fetchBrands()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setFormData({
      name: brand.name,
      name_tamil: brand.name_tamil || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return

    const supabase = createClient()
    const { error } = await supabase.from('brands').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Brand deleted')
    fetchBrands()
  }

  const resetForm = () => {
    setEditingBrand(null)
    setFormData({ name: '', name_tamil: '' })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Brands
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage product brands
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? 'Edit Brand' : 'Add Brand'}
              </DialogTitle>
              <DialogDescription>
                {editingBrand
                  ? 'Update the brand details'
                  : 'Create a new product brand'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Samsung"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_tamil">Brand Name (Tamil)</Label>
                  <Input
                    id="name_tamil"
                    placeholder="e.g., சாம்சங்"
                    value={formData.name_tamil}
                    onChange={(e) =>
                      setFormData({ ...formData, name_tamil: e.target.value })
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
                      {editingBrand ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingBrand ? (
                    'Update Brand'
                  ) : (
                    'Create Brand'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Brands</CardTitle>
          <CardDescription>
            {brands.length} brand{brands.length !== 1 ? 's' : ''} in this shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No brands yet</p>
              <p className="text-sm">Add your first brand to organize products</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Tamil Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {brand.name_tamil || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(brand.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(brand)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(brand.id)}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
