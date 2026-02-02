import { create } from 'zustand'
import type { Product, CartItem, PaymentMethod } from '@/types'

interface CartState {
  items: CartItem[]
  priceTypeId: string | null
  customerName: string
  customerPhone: string
  customerAddress: string
  paymentMethod: PaymentMethod
  discountPercent: number
  notes: string
  
  // Actions
  addItem: (product: Product, quantity: number, unitPrice: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateItemPrice: (productId: string, unitPrice: number) => void
  setPriceTypeId: (priceTypeId: string | null) => void
  setCustomerName: (name: string) => void
  setCustomerPhone: (phone: string) => void
  setCustomerAddress: (address: string) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setDiscountPercent: (percent: number) => void
  setNotes: (notes: string) => void
  clearCart: () => void
  
  // Computed
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTaxableAmount: () => number
  getGstAmount: () => number
  getTotal: () => number
}

function calculateItemTotals(product: Product, quantity: number, unitPrice: number): CartItem {
  const lineTotal = quantity * unitPrice
  const gstAmount = (lineTotal * product.gst_percent) / 100
  
  return {
    product,
    quantity,
    unit_price: unitPrice,
    discount_amount: 0,
    gst_amount: gstAmount,
    total: lineTotal + gstAmount,
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  priceTypeId: null,
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  paymentMethod: 'cash',
  discountPercent: 0,
  notes: '',

  addItem: (product, quantity, unitPrice) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id
      )

      if (existingIndex >= 0) {
        const newItems = [...state.items]
        const existingItem = newItems[existingIndex]
        const newQuantity = existingItem.quantity + quantity
        newItems[existingIndex] = calculateItemTotals(product, newQuantity, unitPrice)
        return { items: newItems }
      }

      return {
        items: [...state.items, calculateItemTotals(product, quantity, unitPrice)],
      }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }))
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.product.id !== productId) }
      }

      return {
        items: state.items.map((item) =>
          item.product.id === productId
            ? calculateItemTotals(item.product, quantity, item.unit_price)
            : item
        ),
      }
    })
  },

  updateItemPrice: (productId, unitPrice) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? calculateItemTotals(item.product, item.quantity, unitPrice)
          : item
      ),
    }))
  },

  setPriceTypeId: (priceTypeId) => set({ priceTypeId }),
  setCustomerName: (name) => set({ customerName: name }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setCustomerAddress: (address) => set({ customerAddress: address }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setDiscountPercent: (percent) => set({ discountPercent: Math.max(0, Math.min(100, percent)) }),
  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      priceTypeId: null,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      paymentMethod: 'cash',
      discountPercent: 0,
      notes: '',
    }),

  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  },

  getDiscountAmount: () => {
    const { discountPercent } = get()
    const subtotal = get().getSubtotal()
    return (subtotal * discountPercent) / 100
  },

  getTaxableAmount: () => {
    return get().getSubtotal() - get().getDiscountAmount()
  },

  getGstAmount: () => {
    const { items, discountPercent } = get()
    const discountMultiplier = 1 - discountPercent / 100
    return items.reduce(
      (sum, item) =>
        sum + ((item.quantity * item.unit_price * item.product.gst_percent) / 100) * discountMultiplier,
      0
    )
  },

  getTotal: () => {
    return get().getTaxableAmount() + get().getGstAmount()
  },
}))
