import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  School,
  Bus,
  Building2,
  MapPin,
  Clock,
  CalendarDays,
  Menu,
  Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/alunos/contagem", label: "Contagem de Alunos", icon: Calculator },
  { href: "/escolas", label: "Escolas", icon: School },
  { href: "/motoristas", label: "Motoristas", icon: Users },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/veiculos", label: "Veículos", icon: Bus },
  { href: "/locais", label: "Locais", icon: MapPin },
  { href: "/tempos-deslocamento", label: "Tempos de Deslocamento", icon: Clock },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4 md:p-6 flex items-center gap-2 border-b border-sidebar-border">
        <Bus className="h-6 w-6 text-sidebar-primary" />
        <span className="font-bold text-lg leading-tight">Transporte Cultural<br/><span className="text-xs font-normal text-sidebar-foreground/70">Prefeitura de Atibaia</span></span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.startsWith(item.href) && (item.href !== "/dashboard" || location === "/dashboard");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="flex h-16 items-center border-b bg-card px-4 md:hidden sticky top-0 z-10 shadow-sm">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-semibold text-lg text-foreground">Transporte Cultural</span>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
