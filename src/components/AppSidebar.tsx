import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Factory,
  CreditCard,
  Truck,
  BarChart3,
  Settings,
  Scissors,
  LogOut,
  UserCheck,
  DollarSign,
  CalendarClock,
  Receipt,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Sales & Front Desk",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Point of Sale (POS)", url: "/pos", icon: CreditCard },
      { title: "All Orders & Bills", url: "/orders", icon: ShoppingCart },
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Pending Dues (Khata)", url: "/ledger", icon: DollarSign },
      { title: "Trial Calendar", url: "/appointments", icon: CalendarClock },
    ],
  },
  {
    label: "Workshop & Operations",
    items: [
      // Only tailors/delivery/admins see their specific workflow
      { title: "My Workflow", url: "/my-work", icon: Scissors, roles: ["tailor", "delivery_person", "admin"] },
      // Only admins/managers see the master production board
      { title: "Master Production", url: "/production", icon: Factory, roles: ["admin", "manager"] },
      { title: "Deliveries", url: "/deliveries", icon: Truck },
    ],
  },
  {
    label: "Management & Account",
    items: [
      { title: "Inventory", url: "/inventory", icon: Package, roles: ["admin", "manager", "inventory_manager"] },
      { title: "Staff & Payroll", url: "/employee-payments", icon: DollarSign, roles: ["admin", "manager"] },
      { title: "Worker Reports", url: "/worker-reports", icon: ListChecks, roles: ["admin", "manager"] },
      { title: "Expenses", url: "/expenses", icon: Receipt, roles: ["admin", "manager"] },
      { title: "User Management", url: "/users", icon: Users, roles: ["admin"] },
      { title: "Analytics & Reports", url: "/reports", icon: BarChart3, roles: ["admin", "manager"] },
      { title: "Settings", url: "/settings", icon: Settings, roles: ["admin", "manager"] },
    ],
  },
];

export function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();

  const isVisible = (item: NavItem) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border/50 px-6 py-5 bg-sidebar-accent/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-serif font-black tracking-tighter text-sidebar-foreground uppercase leading-none" style={{ transform: 'scaleY(1.2)' }}>SUPERB</span>
            <span className="text-[10px] font-medium text-accent uppercase tracking-wider">Secunderabad</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        {navGroups.map((group) => {
          // ... (existing filter logic)
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-6 last:mb-0">
              <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 font-display">
                {group.label}
              </h4>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.url === "/"}
                    className={({ isActive }) => `
                          flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200
                          ${isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-1"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
                      }
                        `}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0 opacity-80" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </SidebarContent>

      {/* Footer - User info */}
      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-accent/5">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3 border border-sidebar-border/50">
          <Avatar className="h-9 w-9 border border-sidebar-foreground/10">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {profile?.full_name ? getInitials(profile.full_name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {profile?.full_name || "User"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {role?.replace("_", " ") || "No role"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={signOut}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
