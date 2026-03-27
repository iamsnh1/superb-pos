import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Users,
  Package,
  Truck,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  CreditCard,
  Scissors,
} from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const statCards = [
    {
      title: "Today's Orders",
      value: stats?.today_orders || 0,
      icon: ShoppingCart,
      change: "Today",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Customers",
      value: stats?.total_customers || 0,
      icon: Users,
      change: "Active",
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Low Stock Items",
      value: stats?.low_stock_count || 0,
      icon: Package,
      change: "Alerts",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pending Orders",
      value: stats?.pending_orders || 0,
      icon: Truck,
      change: "In Progress",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8 p-8">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <Skeleton className="lg:col-span-2 h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in pb-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 shadow-2xl text-primary-foreground">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome back, {profile?.full_name || "Administrator"}
              </h1>
              <p className="mt-2 text-primary-foreground/80 max-w-xl text-lg">
                There are <span className="font-semibold text-white">{stats?.urgent_orders_count || 0} urgent orders</span> requiring attention today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Link to="/production">
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-medium transition-all text-sm">
                  View Schedule
                </button>
              </Link>
              <Link to="/pos">
                <button className="px-4 py-2 bg-white text-primary hover:bg-white/90 rounded-xl font-bold shadow-lg transition-all text-sm">
                  + New Order
                </button>
              </Link>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
        </div>

        {/* Quick Access Zones */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Zone 1: The Counter */}
          <Card className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-blue-600 to-blue-700 text-white pb-8">
              <div className="flex justify-between items-start">
                <CreditCard className="w-10 h-10 opacity-50" />
                <Badge className="bg-white/20 text-white border-0">POS & Sales</Badge>
              </div>
              <CardTitle className="text-2xl pt-4">The Counter</CardTitle>
              <CardDescription className="text-blue-100">Book orders & take payments</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">Today's Sales</span>
                <span className="font-bold">{stats?.today_orders || 0} Orders</span>
              </div>
              <Link to="/pos" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                  + Create New Order
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Zone 2: The Workroom */}
          <Card className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-purple-600 to-purple-700 text-white pb-8">
              <div className="flex justify-between items-start">
                <Scissors className="w-10 h-10 opacity-50" />
                <Badge className="bg-white/20 text-white border-0">Production</Badge>
              </div>
              <CardTitle className="text-2xl pt-4">The Workroom</CardTitle>
              <CardDescription className="text-purple-100">Tailoring & Deliveries</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">In Production</span>
                <span className="font-bold">{stats?.pending_orders || 0} Jobs</span>
              </div>
              <Link to="/my-work" className="block">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200">
                  Open My Tasks
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Zone 3: The Stock */}
          <Card className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-br from-amber-500 to-amber-600 text-white pb-8">
              <div className="flex justify-between items-start">
                <Package className="w-10 h-10 opacity-50" />
                <Badge className="bg-white/20 text-white border-0">Inventory</Badge>
              </div>
              <CardTitle className="text-2xl pt-4">The Stock</CardTitle>
              <CardDescription className="text-amber-500/10">Fabrics & Materials</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">Alerts</span>
                <span className={`font-bold ${stats?.low_stock_count ? 'text-red-500' : ''}`}>
                  {stats?.low_stock_count || 0} Low Stock
                </span>
              </div>
              <Link to="/inventory" className="block">
                <Button variant="outline" className="w-full border-amber-600 text-amber-600 hover:bg-amber-50">
                  Manage Inventory
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Actionable Alerts Bar */}
        {(stats?.urgent_orders_count || 0) > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 transition-all animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium text-sm">
                Attention: You have {stats.urgent_orders_count} urgent orders that need immediate action.
              </p>
            </div>
            <Link to="/production">
              <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-100">
                Fix Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
