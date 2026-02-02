export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Simplified database types - use 'any' for flexibility
// For production, generate proper types using: npx supabase gen types typescript
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      user_role: 'admin' | 'cashier'
      employee_status: 'pending' | 'active' | 'inactive'
      payment_method: 'cash' | 'card' | 'upi' | 'credit'
      stock_movement_type: 'purchase' | 'sale' | 'adjustment' | 'return'
      purchase_order_status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'
    }
  }
}
