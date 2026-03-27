import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBulkOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { addDays, format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useSettings as useSettingsHook } from "@/hooks/useSettings";

interface OrderRow {
  id: string;
  customer_id: string;
  garment_type: string;
  total_amount: number;
  delivery_date: string;
  delivery_type: string;
  priority: string;
  notes: string;
}

const emptyRow = (): OrderRow => ({
  id: crypto.randomUUID(),
  customer_id: "",
  garment_type: "",
  total_amount: 0,
  delivery_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
  delivery_type: "pickup",
  priority: "normal",
  notes: "",
});

interface BulkOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkOrderForm({ open, onOpenChange }: BulkOrderFormProps) {
  const createBulk = useCreateBulkOrders();
  const { data: customers } = useCustomers();
  const { data: templates } = useGarmentTemplates();
  const { data: settings } = useSettingsHook();

  const [rows, setRows] = useState<OrderRow[]>([emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    if (open) {
      setRows([emptyRow(), emptyRow(), emptyRow()]);
    }
  }, [open]);

  const addRow = () => setRows((p) => [...p, emptyRow()]);
  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof OrderRow, value: any) => {
    setRows((p) =>
      p.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value };
        if ((field === "garment_type" || field === "priority") && templates && settings) {
          const gt = field === "garment_type" ? value : r.garment_type;
          const pr = field === "priority" ? value : r.priority;
          const t = templates.find((x: any) => x.code === gt);
          let base = (t as any)?.base_price || 0;
          if (pr === "urgent") {
            const surcharge = parseFloat(settings.urgent_surcharge_percent || "25") / 100;
            base *= 1 + surcharge;
          }
          const gst = parseFloat(settings.gst_rate || "0") / 100;
          next.total_amount = Math.round(base * (1 + gst));
        }
        return next;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = rows.filter((r) => r.customer_id && r.garment_type);
    if (valid.length === 0) return;
    const payload = valid.map((r) => ({
      customer_id: r.customer_id,
      garment_type: r.garment_type,
      total_amount: r.total_amount,
      delivery_date: r.delivery_date,
      delivery_type: r.delivery_type,
      priority: r.priority,
      notes: r.notes || undefined,
    }));
    await createBulk.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Order</DialogTitle>
          <p className="text-sm text-muted-foreground">Add multiple orders at once. Fill customer and garment for each row.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 font-medium w-8">#</th>
                    <th className="text-left p-2 font-medium min-w-[180px]">Customer *</th>
                    <th className="text-left p-2 font-medium min-w-[120px]">Garment *</th>
                    <th className="text-left p-2 font-medium w-24">Amount (₹)</th>
                    <th className="text-left p-2 font-medium w-32">Delivery Date</th>
                    <th className="text-left p-2 font-medium w-24">Type</th>
                    <th className="text-left p-2 font-medium w-24">Priority</th>
                    <th className="text-left p-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2">
                        <Select value={r.customer_id} onValueChange={(v) => updateRow(r.id, "customer_id", v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {(customers || []).map((c: any) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select value={r.garment_type} onValueChange={(v) => updateRow(r.id, "garment_type", v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {templates?.map((g: any) => (
                              <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-9"
                          value={r.total_amount || ""}
                          onChange={(e) => updateRow(r.id, "total_amount", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="date"
                          className="h-9"
                          value={r.delivery_date}
                          onChange={(e) => updateRow(r.id, "delivery_date", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Select value={r.delivery_type} onValueChange={(v) => updateRow(r.id, "delivery_type", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="home_delivery">Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select value={r.priority} onValueChange={(v) => updateRow(r.id, "priority", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(r.id)} disabled={rows.length <= 1}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" /> Add Row
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createBulk.isPending || !rows.some((r) => r.customer_id && r.garment_type)}>
                {createBulk.isPending ? "Creating..." : `Create ${rows.filter((r) => r.customer_id && r.garment_type).length} Orders`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
