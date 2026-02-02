import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Shop, UserRole } from '@/types'

interface ShopState {
  currentShop: Shop | null
  userRole: UserRole | null
  shops: Shop[]
  setCurrentShop: (shop: Shop | null) => void
  setUserRole: (role: UserRole | null) => void
  setShops: (shops: Shop[]) => void
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      currentShop: null,
      userRole: null,
      shops: [],
      setCurrentShop: (shop) => set({ currentShop: shop }),
      setUserRole: (role) => set({ userRole: role }),
      setShops: (shops) => set({ shops }),
    }),
    {
      name: 'shop-storage',
      partialize: (state) => ({ 
        currentShop: state.currentShop ? { id: state.currentShop.id } : null 
      }),
    }
  )
)
