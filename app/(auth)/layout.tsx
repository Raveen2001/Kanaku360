export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/90 via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Kanaku360</h1>
            <p className="mt-2 text-primary-foreground/80">கணக்கு 360</p>
          </div>
          <div className="space-y-6">
            <blockquote className="text-xl font-medium leading-relaxed">
              "The complete billing solution for modern retail businesses. 
              Manage multiple shops, track inventory, and generate GST-compliant bills with ease."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-primary-foreground/20" />
              <span className="text-sm text-primary-foreground/60">Trusted by retailers</span>
              <div className="h-px flex-1 bg-primary-foreground/20" />
            </div>
          </div>
          <div className="text-sm text-primary-foreground/60">
            © 2024 Kanaku360. All rights reserved.
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
      </div>
      
      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
