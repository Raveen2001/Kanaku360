'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Store,
  LayoutDashboard,
  Receipt,
  Package,
  FolderTree,
  Tag,
  DollarSign,
  Users,
  Truck,
  ClipboardList,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Shop } from '@/types'

interface SidebarProps {
  shops: Shop[]
  currentShop: Shop | null
  userRole: string | null
}

export function Sidebar({ shops, currentShop, userRole }: SidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const shopId = params.shopId as string
  const [shopsOpen, setShopsOpen] = useState(true)

  const isAdmin = userRole === 'admin'

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const mainNavItems = [
    {
      title: 'Dashboard',
      href: `/shops/${shopId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Billing',
      href: `/shops/${shopId}/billing`,
      icon: Receipt,
    },
    {
      title: 'Bills History',
      href: `/shops/${shopId}/bills`,
      icon: History,
    },
  ]

  const catalogNavItems = [
    {
      title: 'Products',
      href: `/shops/${shopId}/products`,
      icon: Package,
      adminOnly: false,
    },
    {
      title: 'Categories',
      href: `/shops/${shopId}/categories`,
      icon: FolderTree,
      adminOnly: true,
    },
    {
      title: 'Brands',
      href: `/shops/${shopId}/brands`,
      icon: Tag,
      adminOnly: true,
    },
    {
      title: 'Price Types',
      href: `/shops/${shopId}/price-types`,
      icon: DollarSign,
      adminOnly: true,
    },
  ]

  const inventoryNavItems = [
    {
      title: 'Inventory',
      href: `/shops/${shopId}/inventory`,
      icon: Package,
      adminOnly: true,
    },
    {
      title: 'Suppliers',
      href: `/shops/${shopId}/suppliers`,
      icon: Truck,
      adminOnly: true,
    },
    {
      title: 'Purchase Orders',
      href: `/shops/${shopId}/purchase-orders`,
      icon: ClipboardList,
      adminOnly: true,
    },
  ]

  const settingsNavItems = [
    {
      title: 'Employees',
      href: `/shops/${shopId}/employees`,
      icon: Users,
      adminOnly: true,
    },
    {
      title: 'Shop Settings',
      href: `/shops/${shopId}/settings`,
      icon: Settings,
      adminOnly: true,
    },
  ]

  const NavItem = ({ item }: { item: typeof mainNavItems[0] & { adminOnly?: boolean; exact?: boolean } }) => {
    if (item.adminOnly && !isAdmin) return null

    const isActive = item.exact 
      ? pathname === item.href
      : pathname.startsWith(item.href)

    return (
      <Link href={item.href}>
        <span
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-bold">Kanaku360</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Shop Selector */}
        <Collapsible open={shopsOpen} onOpenChange={setShopsOpen} className="mb-4">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto text-left hover:bg-sidebar-accent/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-sidebar-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-sidebar-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentShop?.name || 'Select Shop'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {currentShop?.name_tamil || 'No shop selected'}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform flex-shrink-0',
                shopsOpen && 'rotate-180'
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {shops.map((shop) => (
              <Link key={shop.id} href={`/shops/${shop.id}`}>
                <span
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    shop.id === shopId
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                  )}
                >
                  <Store className="h-4 w-4" />
                  <span className="truncate">{shop.name}</span>
                </span>
              </Link>
            ))}
            <Link href="/shops/new">
              <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors">
                <Plus className="h-4 w-4" />
                Add New Shop
              </span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        <Separator className="my-4 bg-sidebar-border" />

        {/* Main Navigation */}
        {shopId && (
          <>
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Catalog */}
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Catalog
              </p>
              {catalogNavItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>

            {isAdmin && (
              <>
                <Separator className="my-4 bg-sidebar-border" />

                {/* Inventory */}
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Inventory
                  </p>
                  {inventoryNavItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </div>

                <Separator className="my-4 bg-sidebar-border" />

                {/* Settings */}
                <div className="space-y-1">
                  <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    Settings
                  </p>
                  {settingsNavItems.map((item) => (
                    <NavItem key={item.href} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
