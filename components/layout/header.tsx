'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user: {
    email: string
    full_name?: string | null
    avatar_url?: string | null
  } | null
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, bills..."
              className="w-64 pl-9 bg-muted/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/shops')}>
                Manage Shops
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
