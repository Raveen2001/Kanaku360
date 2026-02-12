import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get current shop
  const { data: currentShop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .single();

  if (!currentShop) {
    notFound();
  }

  // Check if user has access to this shop
  const isOwner = currentShop.owner_id === user.id;

  let userRole: string | null = isOwner ? "admin" : null;

  if (!isOwner) {
    const { data: employee } = await supabase
      .from("shop_employees")
      .select("role")
      .eq("shop_id", shopId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!employee) {
      redirect("/dashboard");
    }

    userRole = employee.role;
  }

  // Get all shops user has access to
  const { data: ownedShops } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: employeeShops } = await supabase
    .from("shop_employees")
    .select("shop:shops(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const shops = [
    ...(ownedShops || []),
    ...((employeeShops as any[])?.map((e) => e.shop).filter(Boolean) || []),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        shops={shops as any}
        currentShop={currentShop as any}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={{
            email: user.email || "",
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
          }}
        />
        <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
