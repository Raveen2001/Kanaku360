'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Truck, Plus, Loader2, MoreHorizontal, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Supplier } from '@/types'

export default function SuppliersPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    notes: '',
  })

  async function fetchSuppliers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true })

    setSuppliers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchSuppliers()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: formData.name,
            contact_person: formData.contact_person || null,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            gstin: formData.gstin || null,
            notes: formData.notes || null,
          })
          .eq('id', editingSupplier.id)

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Supplier updated!')
      } else {
        const { error } = await supabase.from('suppliers').insert({
          shop_id: shopId,
          name: formData.name,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          gstin: formData.gstin || null,
          notes: formData.notes || null,
        })

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Supplier created!')
      }

      setDialogOpen(false)
      resetForm()
      fetchSuppliers()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstin: supplier.gstin || '',
      notes: supplier.notes || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    const supabase = createClient()
    const { error } = await supabase.from('suppliers').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Supplier deleted')
    fetchSuppliers()
  }

  const resetForm = () => {
    setEditingSupplier(null)
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      notes: '',
    })
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.phone?.includes(query) ||
      supplier.email?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Suppliers
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product suppliers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? 'Update supplier details'
                  : 'Add a new supplier for your inventory'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., ABC Traders"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      placeholder="Name"
                      value={formData.contact_person}
                      onChange={(e) =>
                        setFormData({ ...formData, contact_person: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="supplier@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={saving}
                    />
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
                      disabled={saving}
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={saving}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this supplier"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    disabled={saving}
                    rows={2}
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
                      {editingSupplier ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingSupplier ? (
                    'Update Supplier'
                  ) : (
                    'Create Supplier'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No suppliers found</p>
              {suppliers.length === 0 && (
                <p className="text-sm">Add your first supplier to get started</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {supplier.address}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {supplier.contact_person && <p>{supplier.contact_person}</p>}
                        {supplier.phone && (
                          <p className="text-muted-foreground">{supplier.phone}</p>
                        )}
                        {supplier.email && (
                          <p className="text-muted-foreground">{supplier.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplier.gstin || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(supplier.id)}
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
