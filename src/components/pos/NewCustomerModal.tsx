import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { Loader2 } from "lucide-react";

interface NewCustomerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (customer: any) => void;
}

export function NewCustomerModal({ open, onOpenChange, onSuccess }: NewCustomerModalProps) {
    const createCustomer = useCreateCustomer();
    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim() || !form.phone.trim()) return;

        try {
            const newCustomer = await createCustomer.mutateAsync({
                ...form,
                // Default values for required/optional fields not in quick form
                customer_group: 'Regular'
            } as any);

            onSuccess(newCustomer);
            onOpenChange(false);
            // Reset form
            setForm({ full_name: "", phone: "", email: "", address: "", city: "" });
        } catch (error) {
            // Error handled by hook
        }
    };

    const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Quick Customer Registration</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Full Name *</Label>
                        <Input
                            value={form.full_name}
                            onChange={(e) => set("full_name", e.target.value)}
                            required
                            placeholder="Enter customer name"
                        />
                    </div>

                    <div>
                        <Label>Phone Number *</Label>
                        <Input
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            required
                            placeholder="Mobile number"
                            type="tel"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>City</Label>
                            <Input
                                value={form.city}
                                onChange={(e) => set("city", e.target.value)}
                                placeholder="City"
                            />
                        </div>
                        <div>
                            <Label>Email (Optional)</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => set("email", e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Address (Optional)</Label>
                        <Input
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                            placeholder="Street address"
                        />
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={createCustomer.isPending}>
                            {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Register
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
