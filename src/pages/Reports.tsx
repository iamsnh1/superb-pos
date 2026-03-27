import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown,
  Scissors, Package, UserCheck, AlertCircle, Clock, FileSpreadsheet
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { exportAllToExcel } from "@/lib/exportExcel";
import { toast } from "sonner";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [exporting, setExporting] = useState(false);
  const handleExportAll = async () => {
    setExporting(true);
    try {
      await exportAllToExcel();
      toast.success("Export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // === Queries ===
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<any>("/dashboard/stats"),
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-report"],
    queryFn: () => api.get<any>("/dashboard/sales"),
  });

  const { data: profitLoss } = useQuery({
    queryKey: ["profit-loss", startDate, endDate],
    queryFn: () => api.get<any>(`/reports/profit-loss?start_date=${startDate}&end_date=${endDate}`),
  });

  const { data: tailorData } = useQuery({
    queryKey: ["tailor-productivity", startDate, endDate],
    queryFn: () => api.get<any>(`/reports/tailor-productivity?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "tailors" || activeTab === "overview",
  });

  const { data: pendingBalances } = useQuery({
    queryKey: ["pending-balances"],
    queryFn: () => api.get<any>("/reports/pending-balances"),
    enabled: activeTab === "balances" || activeTab === "overview",
  });

  const { data: fabricAnalysis } = useQuery({
    queryKey: ["fabric-analysis", startDate, endDate],
    queryFn: () => api.get<any>(`/reports/fabric-analysis?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "fabric",
  });

  const { data: revenueByGarment } = useQuery({
    queryKey: ["revenue-by-garment", startDate, endDate],
    queryFn: () => api.get<any>(`/reports/revenue-by-garment?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "revenue" || activeTab === "overview",
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers-report", startDate, endDate],
    queryFn: () => api.get<any>(`/reports/top-customers?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "customers" || activeTab === "overview",
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ["expense-summary-report", startDate, endDate],
    queryFn: () => api.get<any>(`/expenses/summary?start_date=${startDate}&end_date=${endDate}`),
    enabled: activeTab === "overview",
  });

  // === Chart Data ===
  const salesChartData = salesData?.sales?.map((s: any) => ({
    name: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    Revenue: s.revenue,
    Orders: s.orders,
  })).reverse().slice(-14) || [];

  const garmentChartData = revenueByGarment?.data?.map((g: any) => ({
    name: g.garment_type,
    Revenue: g.total_revenue,
    Orders: g.order_count,
  })) || [];

  const expenseChartData = expenseSummary?.summary?.map((cat: any) => ({
    name: cat.category,
    value: cat.total,
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Detailed Reports</h1>
            <p className="text-muted-foreground mt-1">Business intelligence across all modules.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" onClick={handleExportAll} disabled={exporting} size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export All to Excel"}
            </Button>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto h-9" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto h-9" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tailors">Tailor Productivity</TabsTrigger>
            <TabsTrigger value="balances">Pending Balances</TabsTrigger>
            <TabsTrigger value="fabric">Fabric Analysis</TabsTrigger>
            <TabsTrigger value="revenue">Revenue by Garment</TabsTrigger>
            <TabsTrigger value="customers">Top Customers</TabsTrigger>
          </TabsList>

          {/* ====== OVERVIEW TAB ====== */}
          <TabsContent value="overview" className="space-y-6">
            {/* P&L Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(profitLoss?.revenue || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(profitLoss?.expenses || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Scissors className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Labor Costs</p>
                      <p className="text-2xl font-bold">{formatCurrency(profitLoss?.labor_costs || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`bg-gradient-to-br ${(profitLoss?.gross_profit || 0) >= 0 ? 'from-emerald-50 to-emerald-100/50 border-emerald-200/50' : 'from-red-50 to-red-100/50 border-red-200/50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className={`h-8 w-8 ${(profitLoss?.gross_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Gross Profit</p>
                      <p className={`text-2xl font-bold ${(profitLoss?.gross_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(profitLoss?.gross_profit || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trend (Last 14 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} />
                        <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {expenseChartData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v as number)} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick summaries */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" /> Pending Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(pendingBalances?.total_pending || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">{pendingBalances?.customers?.length || 0} customers with dues</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" /> Active Tailors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{tailorData?.tailors?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {tailorData?.tailors?.reduce((s: number, t: any) => s + (t.completed_orders || 0), 0) || 0} orders completed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Top Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold truncate">{topCustomers?.customers?.[0]?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(topCustomers?.customers?.[0]?.total_spent || 0)} spent
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ====== TAILOR PRODUCTIVITY TAB ====== */}
          <TabsContent value="tailors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" /> Tailor-wise Productivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tailor</TableHead>
                      <TableHead className="text-center">Total Orders</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Rework</TableHead>
                      <TableHead className="text-center">Avg Hours</TableHead>
                      <TableHead className="text-center">QC Pass</TableHead>
                      <TableHead className="text-center">QC Fail</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tailorData?.tailors || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No tailor data available</TableCell>
                      </TableRow>
                    ) : (
                      (tailorData?.tailors || []).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.full_name}</TableCell>
                          <TableCell className="text-center">{t.total_orders}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">{t.completed_orders}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{t.pending_orders}</TableCell>
                          <TableCell className="text-center">
                            {t.rework_orders > 0 && <Badge variant="destructive">{t.rework_orders}</Badge>}
                            {!t.rework_orders && "0"}
                          </TableCell>
                          <TableCell className="text-center">{t.avg_hours || "—"} hrs</TableCell>
                          <TableCell className="text-center text-green-600">{t.qc_passed || 0}</TableCell>
                          <TableCell className="text-center text-red-600">{t.qc_failed || 0}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(t.total_earnings || 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== PENDING BALANCES TAB ====== */}
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" /> Pending Customer Balances
                  </span>
                  <Badge variant="destructive" className="text-lg px-4">
                    Total: {formatCurrency(pendingBalances?.total_pending || 0)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Total Billed</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pendingBalances?.customers || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No pending balances — all customers are up to date! 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      (pendingBalances?.customers || []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.customer_code}</TableCell>
                          <TableCell className="font-medium">{c.full_name}</TableCell>
                          <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                          <TableCell className="text-center">{c.total_orders}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.total_billed)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(c.total_paid)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{formatCurrency(c.total_balance)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== FABRIC ANALYSIS TAB ====== */}
          <TabsContent value="fabric">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" /> Fabric Consumption vs. Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Purchased</TableHead>
                      <TableHead className="text-right">Consumed</TableHead>
                      <TableHead className="text-right">Adjusted In</TableHead>
                      <TableHead className="text-right">Transferred Out</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fabricAnalysis?.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No fabric transaction data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      (fabricAnalysis?.items || []).map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right text-green-600">{item.purchased || 0}</TableCell>
                          <TableCell className="text-right text-red-600">{item.consumed || 0}</TableCell>
                          <TableCell className="text-right">{item.adjusted_in || 0}</TableCell>
                          <TableCell className="text-right">{item.transferred_out || 0}</TableCell>
                          <TableCell className="text-right font-semibold">{item.current_stock || 0}</TableCell>
                          <TableCell className="text-right">{item.reorder_level || 0}</TableCell>
                          <TableCell>
                            {(item.current_stock || 0) <= (item.reorder_level || 0) && (item.reorder_level || 0) > 0 ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-700">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== REVENUE BY GARMENT TAB ====== */}
          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" /> Revenue by Garment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={garmentChartData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} cursor={{ fill: "transparent" }} />
                      <Bar dataKey="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Garment Type</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Value</TableHead>
                      <TableHead className="text-right">Pending Amt</TableHead>
                      <TableHead className="text-center">Urgent</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(revenueByGarment?.data || []).map((g: any) => (
                      <TableRow key={g.garment_type}>
                        <TableCell className="font-medium capitalize">{g.garment_type}</TableCell>
                        <TableCell className="text-center">{g.order_count}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(g.total_revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(g.avg_order_value)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(g.pending_amount)}</TableCell>
                        <TableCell className="text-center">
                          {g.urgent_count > 0 && <Badge variant="destructive">{g.urgent_count}</Badge>}
                        </TableCell>
                        <TableCell className="text-center text-green-600">{g.delivered_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== TOP CUSTOMERS TAB ====== */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Top Customers by Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead>Garments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topCustomers?.customers || []).map((c: any, i: number) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{c.customer_code}</TableCell>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{c.customer_group || "Regular"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{c.order_count}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(c.total_spent)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(c.pending_balance)}</TableCell>
                        <TableCell className="text-sm">
                          {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate capitalize">
                          {c.garment_types || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
