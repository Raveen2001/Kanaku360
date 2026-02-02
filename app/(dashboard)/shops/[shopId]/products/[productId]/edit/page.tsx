import { use } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/products/product-form'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ shopId: string; productId: string }>
}) {
  const { shopId, productId } = use(params)
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('shop_id', shopId)
    .single()

  if (!product) {
    notFound()
  }

  const { data: productPrices } = await supabase
    .from('product_prices')
    .select('*')
    .eq('product_id', productId)

  return (
    <ProductForm
      shopId={shopId}
      product={product}
      productPrices={productPrices || []}
    />
  )
}
