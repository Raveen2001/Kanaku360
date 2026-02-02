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
import { Users, Plus, Loader2, MoreHorizontal, Mail, UserX, Shield, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { ShopEmployee, UserRole } from '@/types'

export default function EmployeesPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [employees, setEmployees] = useState<ShopEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('cashier')

  async function fetchEmployees() {
    const supabase = createClient()
    const { data } = await supabase
      .from('shop_employees')
      .select(`
        *,
        user:profiles(id, email, full_name, avatar_url)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    setEmployees((data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [shopId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)

    try {
      const supabase = createClient()

      // Check if already invited
      const { data: existing } = await supabase
        .from('shop_employees')
        .select('id')
        .eq('shop_id', shopId)
        .eq('invited_email', inviteEmail.toLowerCase())
        .single()

      if (existing) {
        toast.error('This email has already been invited')
        setInviting(false)
        return
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.toLowerCase())
        .single()

      const { error } = await supabase.from('shop_employees').insert({
        shop_id: shopId,
        invited_email: inviteEmail.toLowerCase(),
        user_id: existingUser?.id || null,
        role: inviteRole,
        status: existingUser ? 'active' : 'pending',
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(
        existingUser
          ? 'Employee added successfully!'
          : 'Invitation sent! They will get access when they sign up.'
      )
      setDialogOpen(false)
      setInviteEmail('')
      setInviteRole('cashier')
      fetchEmployees()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('shop_employees')
      .delete()
      .eq('id', employeeId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Employee removed')
    fetchEmployees()
  }

  const handleUpdateRole = async (employeeId: string, newRole: UserRole) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('shop_employees')
      .update({ role: newRole })
      .eq('id', employeeId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Role updated')
    fetchEmployees()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-primary/10 text-primary">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'cashier':
        return (
          <Badge variant="outline">
            <Shield className="w-3 h-3 mr-1" />
            Cashier
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Employees
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage who can access this shop
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Invite someone to access this shop. They&apos;ll get access once they sign up with this email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="employee@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as UserRole)}
                    disabled={inviting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashier">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Cashier - Billing access only
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={inviting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Add Employee
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No employees added yet</p>
              <p className="text-sm">Add your first team member to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {employee.user?.full_name || 'Pending User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.invited_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(employee.role)}</TableCell>
                    <TableCell>{getStatusBadge(employee.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(employee.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateRole(
                                employee.id,
                                employee.role === 'admin' ? 'cashier' : 'admin'
                              )
                            }
                          >
                            {employee.role === 'admin' ? (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Change to Cashier
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Change to Admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(employee.id)}
                            className="text-destructive"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Remove Employee
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
