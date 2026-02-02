'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderTree,
  Plus,
  Loader2,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
  Folder,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryTreeItemProps {
  category: Category & { children?: Category[] }
  level: number
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

function CategoryTreeItem({ category, level, onEdit, onDelete }: CategoryTreeItemProps) {
  const [isOpen, setIsOpen] = useState(level === 0)
  const hasChildren = category.children && category.children.length > 0

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 group',
            level > 0 && 'ml-6'
          )}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isOpen && 'rotate-90'
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            ) : (
              <div className="w-6" />
            )}
            {isOpen ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <span className="font-medium">{category.name}</span>
              {category.name_tamil && (
                <span className="text-muted-foreground ml-2 text-sm">
                  ({category.name_tamil})
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(category.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {hasChildren && (
          <CollapsibleContent>
            {category.children?.map((child) => (
              <CategoryTreeItem
                key={child.id}
                category={child}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export default function CategoriesPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    name_tamil: '',
    parent_id: '',
  })

  async function fetchCategories() {
    const supabase = createClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    const flatCategories = data || []
    setCategories(flatCategories)
    
    // Build tree structure
    const tree = buildCategoryTree(flatCategories)
    setCategoryTree(tree)
    setLoading(false)
  }

  function buildCategoryTree(flatCategories: Category[]): Category[] {
    const map = new Map<string, Category & { children: Category[] }>()
    const roots: (Category & { children: Category[] })[] = []

    // First pass: create map entries with children arrays
    flatCategories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build hierarchy
    flatCategories.forEach((cat) => {
      const node = map.get(cat.id)!
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  useEffect(() => {
    fetchCategories()
  }, [shopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            name_tamil: formData.name_tamil || null,
            parent_id: formData.parent_id || null,
          })
          .eq('id', editingCategory.id)

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Category updated!')
      } else {
        const { error } = await supabase.from('categories').insert({
          shop_id: shopId,
          name: formData.name,
          name_tamil: formData.name_tamil || null,
          parent_id: formData.parent_id || null,
        })

        if (error) {
          toast.error(error.message)
          return
        }
        toast.success('Category created!')
      }

      setDialogOpen(false)
      resetForm()
      fetchCategories()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      name_tamil: category.name_tamil || '',
      parent_id: category.parent_id || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will be uncategorized.')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Category deleted')
    fetchCategories()
  }

  const resetForm = () => {
    setEditingCategory(null)
    setFormData({ name: '', name_tamil: '', parent_id: '' })
  }

  const getAvailableParents = () => {
    // Can't set self or descendants as parent
    if (!editingCategory) return categories
    
    const descendants = new Set<string>()
    const findDescendants = (id: string) => {
      descendants.add(id)
      categories.filter(c => c.parent_id === id).forEach(c => findDescendants(c.id))
    }
    findDescendants(editingCategory.id)
    
    return categories.filter(c => !descendants.has(c.id))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="w-6 h-6" />
            Categories
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your products into categories
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Update the category details'
                  : 'Create a new product category'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Electronics"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_tamil">Category Name (Tamil)</Label>
                  <Input
                    id="name_tamil"
                    placeholder="e.g., மின்னணுவியல்"
                    value={formData.name_tamil}
                    onChange={(e) =>
                      setFormData({ ...formData, name_tamil: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent">Parent Category</Label>
                  <Select
                    value={formData.parent_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parent_id: value })
                    }
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No parent (root category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No parent (root category)</SelectItem>
                      {getAvailableParents().map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : editingCategory ? (
                    'Update Category'
                  ) : (
                    'Create Category'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Tree</CardTitle>
          <CardDescription>
            Click on a category with subcategories to expand it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : categoryTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Add your first category to organize products</p>
            </div>
          ) : (
            <div className="space-y-1">
              {categoryTree.map((category) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  level={0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
