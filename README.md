# Kanaku360 - Multi-Shop Billing Application

A comprehensive billing and inventory management application built with Next.js 14 and Supabase, designed for Indian retail businesses.

## Features

### Multi-Shop Management
- Create and manage multiple shops from a single account
- Shop-specific data isolation with Row Level Security
- Invite employees with role-based access (Admin/Cashier)

### Product Catalog
- Nested category hierarchy with tree view
- Brand management
- Bilingual support (English + Tamil)
- Multiple pricing tiers (Retail, Wholesale, Dealer, etc.)
- SKU and barcode support

### Point of Sale (POS)
- Fast product search with barcode scanning
- Real-time cart management
- Price type selection with automatic fallback
- GST calculation
- Multiple payment methods (Cash, Card, UPI, Credit)
- Discount support

### Thermal Printing
- 80mm thermal receipt formatting
- Shop branding with logo support
- GST invoice format with CGST/SGST breakdown
- Tamil language support on receipts

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Stock adjustment with audit trail
- Purchase order management
- Supplier management
- Stock movement history

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Printing**: react-to-print

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Kanaku360
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`

5. Set up storage buckets in Supabase:
   - Create buckets: `shop-assets`, `product-images`, `category-images`, `brand-images`
   - Set them as public buckets

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/
│   │   └── shops/
│   │       └── [shopId]/
│   │           ├── billing/
│   │           ├── products/
│   │           ├── categories/
│   │           ├── brands/
│   │           ├── price-types/
│   │           ├── inventory/
│   │           ├── purchase-orders/
│   │           ├── suppliers/
│   │           ├── bills/
│   │           ├── employees/
│   │           └── settings/
│   └── auth/callback/       # OAuth callback
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   ├── billing/             # Billing components
│   └── products/            # Product components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   ├── store/              # Zustand stores
│   ├── hooks/              # Custom hooks
│   └── utils.ts            # Utility functions
├── types/                   # TypeScript types
└── supabase/
    └── migrations/         # Database migrations
```

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- `profiles` - User profiles (extends auth.users)
- `shops` - Shop information
- `shop_employees` - Employee assignments and roles
- `categories` - Product categories (supports nesting)
- `brands` - Product brands
- `products` - Product catalog
- `price_types` - Different pricing tiers
- `product_prices` - Product-specific prices per tier
- `bills` - Sales bills
- `bill_items` - Bill line items
- `suppliers` - Supplier information
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items
- `stock_movements` - Stock change audit trail

## User Roles

### Admin
- Full access to all shop features
- Can manage employees, products, categories, brands
- Can view reports and settings
- Can process billing

### Cashier
- Can view products
- Can process billing
- Cannot modify products or settings

## License

MIT License - feel free to use this project for your own purposes.

## Support

For support, please open an issue on the GitHub repository.
