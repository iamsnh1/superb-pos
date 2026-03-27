import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrder, useTailors } from "@/hooks/useOrders";
import { useCustomers, useMeasurements } from "@/hooks/useCustomers";
import { useInventoryItems } from "@/hooks/useInventory";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { useSettings } from "@/hooks/useSettings"; // Import useSettings
import { addDays, format } from "date-fns";

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderForm({ open, onOpenChange }: OrderFormProps) {
  const createOrder = useCreateOrder();
  const { data: customers } = useCustomers();
  const { data: tailors } = useTailors();
  const { data: inventoryItems } = useInventoryItems();
  const { data: templates } = useGarmentTemplates();
  const { data: settings } = useSettings(); // Use settings

  const [customerId, setCustomerId] = useState("");
  const { data: measurements } = useMeasurements(customerId || null);

  const [form, setForm] = useState({
    garment_type: "",
    measurement_profile_id: "",
    fabric_source: "inventory",
    fabric_item_id: "",
    assigned_tailor_id: "",
    delivery_date: "",
    delivery_type: "pickup",
    priority: "normal",
    total_amount: 0,
    notes: "",
  });

  const [designSpecs, setDesignSpecs] = useState<Record<string, string>>({
    collar: "", cuff: "", pocket: "", fitting: "",
  });

  // Set default garment type
  useEffect(() => {
    if (!form.garment_type && templates && templates.length > 0) {
      setForm(p => ({ ...p, garment_type: templates[0].code }));
    }
  }, [templates, form.garment_type]);

  // Calculate pricing when garment type or priority changes
  useEffect(() => {
    if (form.garment_type && templates && settings) {
      const template = templates.find((t: any) => t.code === form.garment_type);
      const base = template?.base_price || 0;
      let total = base;

      // Add urgent surcharge
      if (form.priority === "urgent") {
        const surcharge = parseFloat(settings.urgent_surcharge_percent || "0") / 100;
        total += (total * surcharge);
      }

      // Add GST
      const gst = parseFloat(settings.gst_rate || "0") / 100;
      total += (total * gst);

      setForm(p => ({ ...p, total_amount: Math.round(total) }));
    }
  }, [form.garment_type, form.priority, templates, settings]);

  // Auto-set delivery date based on priority (7 days normal, 3 days urgent)
  useEffect(() => {
    if (!form.delivery_date) {
      const days = form.priority === "urgent" ? 3 : 7;
      setForm((p) => ({ ...p, delivery_date: format(addDays(new Date(), days), "yyyy-MM-dd") }));
    }
  }, [form.priority]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !form.garment_type) return;
    const specs = Object.fromEntries(Object.entries(designSpecs).filter(([_, v]) => v));
    await createOrder.mutateAsync({
      customer_id: customerId,
      garment_type: form.garment_type,
      measurement_profile_id: form.measurement_profile_id || undefined,
      fabric_source: form.fabric_source,
      fabric_item_id: form.fabric_source === "inventory" && form.fabric_item_id ? form.fabric_item_id : undefined,
      assigned_tailor_id: form.assigned_tailor_id || undefined,
      delivery_date: form.delivery_date || undefined,
      delivery_type: form.delivery_type,
      priority: form.priority,
      total_amount: form.total_amount,
      net_amount: form.total_amount,
      balance_amount: form.total_amount,
      design_specifications: specs,
      notes: form.notes || undefined,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId("");
    setForm({
      garment_type: templates?.[0]?.code || "",
      measurement_profile_id: "",
      fabric_source: "inventory",
      fabric_item_id: "",
      assigned_tailor_id: "",
      delivery_date: "",
      delivery_type: "pickup",
      priority: "normal",
      total_amount: 0,
      notes: "",
    });
    setDesignSpecs({ collar: "", cuff: "", pocket: "", fitting: "" });
  };

  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const matchingMeasurements = (measurements || []).filter((m: any) => m.garment_type === form.garment_type);

  // Filter fabric items from inventory
  const fabricItems = (inventoryItems || []).filter((item: any) => {
    const attrs = item.attributes || {};
    return item.unit === "meters" || item.unit === "yards" || attrs.type === "fabric";
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(customers || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.customer_code} — {c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Garment Type *</Label>
              <Select value={form.garment_type} onValueChange={(v) => set("garment_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((g: any) => <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Measurements</Label>
              <Select value={form.measurement_profile_id} onValueChange={(v) => set("measurement_profile_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                <SelectContent>
                  {matchingMeasurements.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.label || "Default"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fabric Source</Label>
              <Select value={form.fabric_source} onValueChange={(v) => { set("fabric_source", v); if (v !== "inventory") set("fabric_item_id", ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">From Inventory</SelectItem>
                  <SelectItem value="customer_provided">Customer Provided</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.fabric_source === "inventory" && (
              <div>
                <Label>Select Fabric</Label>
                <Select value={form.fabric_item_id} onValueChange={(v) => set("fabric_item_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Choose fabric" /></SelectTrigger>
                  <SelectContent>
                    {fabricItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_code} — {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Assign Tailor</Label>
              <Select value={form.assigned_tailor_id} onValueChange={(v) => set("assigned_tailor_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select tailor" /></SelectTrigger>
                <SelectContent>
                  {(tailors || []).map((t: any) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {(t.profiles as any)?.full_name || "Tailor"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent (+50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
            </div>
            <div>
              <Label>Delivery Type</Label>
              <Select value={form.delivery_type} onValueChange={(v) => set("delivery_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="home_delivery">Home Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Amount (₹)</Label>
              <Input type="number" min="0" step="0.01" value={form.total_amount} onChange={(e) => set("total_amount", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Design Specifications</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(designSpecs).map(([key, value]) => (
                <div key={key}>
                  <Label className="text-xs capitalize">{key} Style</Label>
                  <Input value={value} onChange={(e) => setDesignSpecs((p) => ({ ...p, [key]: e.target.value }))} placeholder={`e.g. Regular ${key}`} maxLength={100} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createOrder.isPending || !customerId}>
              {createOrder.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
