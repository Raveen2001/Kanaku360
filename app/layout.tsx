import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanaku360 - Complete Billing Solution",
  description:
    "Multi-shop billing application with inventory management and GST support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <body className="h-full overflow-hidden antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
