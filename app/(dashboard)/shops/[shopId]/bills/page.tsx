'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { History, Search, Loader2, Eye, Printer } from 'lucide-react'
import { BillReceipt } from '@/components/billing/bill-receipt'
import type { Bill, Shop, BillItem } from '@/types'

export default function BillsPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  const [bills, setBills] = useState<(Bill & { items: BillItem[] })[]>([])
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('today')
  const [selectedBill, setSelectedBill] = useState<(Bill & { items: BillItem[] }) | null>(null)

  async function fetchBills() {
    const supabase = createClient()
    
    // Get shop
    const { data: shopData } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()
    
    setShop(shopData)

    // Build date filter
    let dateCondition = ''
    const now = new Date()
    
    switch (dateFilter) {
      case 'today':
        dateCondition = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        break
      case 'week':
        now.setDate(now.getDate() - 7)
        dateCondition = now.toISOString()
        break
      case 'month':
        now.setMonth(now.getMonth() - 1)
        dateCondition = now.toISOString()
        break
      default:
        dateCondition = ''
    }

    let query = supabase
      .from('bills')
      .select(`
        *,
        items:bill_items(*)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    if (dateCondition) {
      query = query.gte('created_at', dateCondition)
    }

    const { data } = await query

    setBills((data as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBills()
  }, [shopId, dateFilter])

  const filteredBills = bills.filter((bill) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      bill.bill_number.toLowerCase().includes(query) ||
      bill.customer_name?.toLowerCase().includes(query) ||
      bill.customer_phone?.includes(query)
    )
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, string> = {
      cash: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      upi: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      credit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    }
    return (
      <Badge className={variants[method] || ''}>
        {method.toUpperCase()}
      </Badge>
    )
  }

  const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0)
  const totalBills = filteredBills.length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            Bills History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage past bills
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Bill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBills > 0 ? totalSales / totalBills : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
          <CardDescription>
            {filteredBills.length} bills found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill number, customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No bills found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">
                        {bill.bill_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{bill.customer_name || 'Walk-in'}</p>
                          {bill.customer_phone && (
                            <p className="text-sm text-muted-foreground">
                              {bill.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {bill.items?.length || 0} items
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(bill.total)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(bill.payment_method)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(bill.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      {selectedBill && shop && (
        <BillReceipt
          bill={selectedBill}
          shop={shop}
          open={!!selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  )
}
