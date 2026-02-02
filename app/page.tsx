import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Store, Receipt, Package, Users, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Kanaku360</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now with GST-compliant billing
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            The Complete Billing Solution for{' '}
            <span className="text-primary">Modern Retail</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage multiple shops, track inventory, and generate professional bills with ease. 
            Built for Indian businesses with Tamil language support.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 h-12 px-8">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Sign in to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to run your business</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From billing to inventory management, Kanaku360 has all the tools you need.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Store,
              title: 'Multi-Shop Management',
              description: 'Manage multiple shops from a single dashboard with role-based access.',
            },
            {
              icon: Receipt,
              title: 'GST Billing',
              description: 'Generate GST-compliant bills with thermal printer support.',
            },
            {
              icon: Package,
              title: 'Inventory Control',
              description: 'Track stock levels, set alerts, and manage purchase orders.',
            },
            {
              icon: Users,
              title: 'Team Access',
              description: 'Add employees with admin or cashier roles for each shop.',
            },
          ].map((feature, index) => (
            <div 
              key={index}
              className="group p-6 bg-card rounded-2xl border hover:shadow-lg transition-all hover:border-primary/50"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why choose Kanaku360?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              'Multiple pricing tiers for different customer types',
              'Bilingual support with Tamil language',
              'Real-time inventory tracking',
              'Thermal printer optimized receipts',
              'Purchase order management',
              'Detailed sales reports',
              'Category and brand organization',
              'Employee access control',
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary rounded-3xl p-12 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your business?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of retailers who trust Kanaku360 for their billing needs.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="h-12 px-8">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Kanaku360</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Kanaku360. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
