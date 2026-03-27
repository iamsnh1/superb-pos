import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManufacturingOrders, useUpdateManufacturingOrder } from "@/hooks/useProduction";
import { MO_STATUSES, getStatusConfig } from "@/lib/constants";
import { format } from "date-fns";
import { Scissors, CheckCircle, Clock, AlertTriangle, MessageSquare } from "lucide-react";
import { useTailors } from "@/hooks/useOrders"; // Reuse tailor hook

export default function ProductionPage() {
  const [statusFilter, setStatusFilter] = useState("active");
  const { data: mos, isLoading, error } = useManufacturingOrders();
  const { data: tailors } = useTailors();
  const updateMo = useUpdateManufacturingOrder();

  if (error) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-destructive">
          Error loading production: {(error as any).message}
        </div>
      </AppLayout>
    );
  }

  const filteredMos = mos?.filter(mo => {
    if (statusFilter === 'active') return mo.status !== 'completed';
    if (statusFilter === 'completed') return mo.status === 'completed';
    return true;
  });

  const handleStatusChange = (id: number, status: string) => {
    updateMo.mutate({ id, status });
  };

  const handleTailorChange = (id: number, tailorId: string) => {
    const value = tailorId === "unassigned" ? null : parseInt(tailorId);
    updateMo.mutate({ id, assigned_tailor_id: value });
  };

  const handleCostChange = (id: number, cost: string) => {
    const value = parseFloat(cost);
    if (!isNaN(value)) {
      updateMo.mutate({ id, labor_cost: value });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Master Production</h1>
            <p className="text-sm text-muted-foreground">Manage entire production workflow and tailor assignments</p>
          </div>
        </div>

        <Tabs defaultValue="active" onValueChange={setStatusFilter}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="completed">Completed History</TabsTrigger>
              <TabsTrigger value="workload">Tailor Workload</TabsTrigger>
            </TabsList>
            {mos !== undefined && (
              <div className="text-sm font-medium bg-muted px-3 py-1 rounded-full text-muted-foreground animate-in fade-in slide-in-from-right-2">
                Total Found: {mos.length}
              </div>
            )}
          </div>

          <TabsContent value="active" className="space-y-4">
            <ProductionTable mos={filteredMos} isLoading={isLoading} tailors={tailors} onStatusChange={handleStatusChange} onTailorChange={handleTailorChange} onCostChange={handleCostChange} />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <ProductionTable mos={filteredMos} isLoading={isLoading} tailors={tailors} onStatusChange={handleStatusChange} onTailorChange={handleTailorChange} onCostChange={handleCostChange} />
          </TabsContent>

          <TabsContent value="workload">
            <TailorWorkload tailors={tailors} mos={mos} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ProductionTable({ mos, isLoading, tailors, onStatusChange, onTailorChange, onCostChange }: any) {
  if (isLoading) return <div>Loading...</div>;
  if (!mos?.length) return <div className="text-center py-10 text-muted-foreground">No orders found</div>;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MO #</TableHead>
            <TableHead>Order Details</TableHead>
            <TableHead>Tailor</TableHead>
            <TableHead>Labor Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Notify</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mos.map((mo: any) => {
            const statusConfig = getStatusConfig(MO_STATUSES, mo.status);
            return (
              <TableRow key={mo.id}>
                <TableCell className="font-medium">{mo.mo_number}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{mo.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{mo.garment_type} • {mo.order_number}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={mo.assigned_tailor_id?.toString() || "unassigned"}
                    onValueChange={(v) => onTailorChange(mo.id, v)}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Assign Tailor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {tailors?.map((t: any) => (
                        <SelectItem key={t.user_id} value={t.user_id.toString()}>{t.profiles.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span className="text-muted-foreground mr-1">₹</span>
                    <Input
                      className="w-20 h-8"
                      type="number"
                      defaultValue={mo.labor_cost || 0}
                      onBlur={(e) => onCostChange(mo.id, e.target.value)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={mo.status}
                    onValueChange={(v) => onStatusChange(mo.id, v)}
                  >
                    <SelectTrigger className={`w-[140px] h-8 ${statusConfig.color} border-0`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MO_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={mo.priority === 'urgent' ? 'text-destructive font-medium' : ''}>
                      {mo.delivery_date ? (() => {
                        try {
                          const date = new Date(mo.delivery_date);
                          return isNaN(date.getTime()) ? "No Date" : format(date, "MMM d");
                        } catch (e) {
                          return "No Date";
                        }
                      })() : "No Date"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => {
                            if (!mo.customer_phone) {
                                alert("No phone number recorded for this customer order.");
                                return;
                            }
                            const msg = `Hi ${mo.customer_name}, your order ${mo.order_number} (${mo.garment_type}) is currently in status: ${statusConfig.label}. Please contact us if you have questions.`;
                            window.open(`https://wa.me/${mo.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        title="Send WhatsApp Update"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function TailorWorkload({ tailors, mos }: any) {
  if (!tailors) return null;

  // Group By Tailor
  const workload = tailors.map((t: any) => {
    const assigned = mos?.filter((m: any) => m.assigned_tailor_id === t.user_id && m.status !== 'completed') || [];
    const completed = mos?.filter((m: any) => m.assigned_tailor_id === t.user_id && m.status === 'completed') || [];
    return { ...t, activeCount: assigned.length, completedCount: completed.length };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workload.map((t: any) => (
        <Card key={t.user_id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.profiles.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Active Orders</span>
              <Badge variant={t.activeCount > 5 ? "destructive" : "secondary"}>{t.activeCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed</span>
              <Badge variant="outline">{t.completedCount}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
