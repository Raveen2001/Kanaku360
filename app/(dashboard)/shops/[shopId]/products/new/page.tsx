import { use } from 'react'
import { ProductForm } from '@/components/products/product-form'

export default function NewProductPage({
  params,
}: {
  params: Promise<{ shopId: string }>
}) {
  const { shopId } = use(params)
  
  return <ProductForm shopId={shopId} />
}
