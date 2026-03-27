import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
}

export function CustomerForm({ open, onOpenChange, customer }: CustomerFormProps) {
  const isEdit = !!customer;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [form, setForm] = useState({
    full_name: customer?.full_name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    address: customer?.address || "",
    city: customer?.city || "",
    state: customer?.state || "",
    zip_code: customer?.zip_code || "",
    birthday: customer?.birthday || "",
    anniversary: customer?.anniversary || "",
    gender: customer?.gender || "",
    customer_group: customer?.customer_group || "Regular",
    notes: customer?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    if (isEdit) {
      await updateCustomer.mutateAsync({ id: customer.id, ...form });
    } else {
      await createCustomer.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required maxLength={100} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
            </div>

            {/* Address Section */}
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={255} placeholder="Street Address" />
            </div>
            <div className="grid grid-cols-3 gap-2 col-span-2">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label>Zip Code</Label>
                <Input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} maxLength={20} />
              </div>
            </div>

            {/* Profile Details */}
            <div>
              <Label>Gender</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Group</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.customer_group}
                onChange={(e) => set("customer_group", e.target.value)}
              >
                <option value="Regular">Regular</option>
                <option value="VIP">VIP</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>
            <div>
              <Label>Birthday</Label>
              <Input type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
            </div>
            <div>
              <Label>Anniversary</Label>
              <Input type="date" value={form.anniversary} onChange={(e) => set("anniversary", e.target.value)} />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
