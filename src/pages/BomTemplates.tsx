import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileStack, Trash2, Package } from "lucide-react";
import { useBomTemplates, useBomTemplateItems, useCreateBomTemplate, useCreateBomTemplateItem, useDeleteBomTemplateItem } from "@/hooks/useBomTemplates";
import { useInventoryItems } from "@/hooks/useInventory";
import { useGarmentTemplates } from "@/hooks/useTemplates";
import { INVENTORY_UNITS } from "@/lib/constants";

export default function BomTemplates() {
    const { data: templates, isLoading } = useBomTemplates();
    const { data: garmentTemplates } = useGarmentTemplates();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-foreground">BOM Templates</h1>
                        <p className="text-sm text-muted-foreground">Manage bill of materials templates per garment type</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Template</Button>
                </div>

                {isLoading ? (
                    <Card className="border-0 shadow-sm"><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
                ) : !templates || templates.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <FileStack className="mb-4 h-12 w-12 text-muted-foreground/30" />
                            <h3 className="text-lg font-medium text-foreground">No templates yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Create templates to auto-generate BOM for orders</p>
                            <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Template</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((t: any) => {
                            const garmentLabel = garmentTemplates?.find((g) => g.code === t.garment_type)?.name || t.garment_type;
                            const itemCount = (t.bom_template_items as any)?.[0]?.count || 0;
                            return (
                                <Card key={t.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(t.id)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <span>{t.name}</span>
                                            <Badge variant="secondary">{garmentLabel}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{t.description || "No description"}</p>
                                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                            <Package className="h-3 w-3" />
                                            <span>{itemCount} items</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
                {selectedId && <TemplateDetailDialog templateId={selectedId} onClose={() => setSelectedId(null)} />}
            </div>
        </AppLayout>
    );
}

function CreateTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const createTemplate = useCreateBomTemplate();
    const { data: garmentTemplates } = useGarmentTemplates();
    const [form, setForm] = useState({ garment_type: "", name: "", description: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.garment_type || !form.name) return;
        await createTemplate.mutateAsync(form);
        onOpenChange(false);
        setForm({ garment_type: "", name: "", description: "" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>New BOM Template</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Garment Type *</Label>
                        <Select value={form.garment_type} onValueChange={(v) => setForm((p) => ({ ...p, garment_type: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select garment" /></SelectTrigger>
                            <SelectContent>
                                {garmentTemplates?.map((g) => <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Template Name *</Label>
                        <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard Shirt BOM" />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={createTemplate.isPending || !form.garment_type || !form.name}>Create</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function TemplateDetailDialog({ templateId, onClose }: { templateId: string; onClose: () => void }) {
    const { data: templates } = useBomTemplates();
    const { data: items } = useBomTemplateItems(templateId);
    const { data: inventoryItems } = useInventoryItems();
    const { data: garmentTemplates } = useGarmentTemplates();
    const createItem = useCreateBomTemplateItem();
    const deleteItem = useDeleteBomTemplateItem();

    const [addForm, setAddForm] = useState({ item_id: "", item_name: "", default_quantity: 1, unit: "pieces" });
    const [showAdd, setShowAdd] = useState(false);

    const template = templates?.find((t: any) => t.id === templateId);
    if (!template) return null;

    const garmentLabel = garmentTemplates?.find((g) => g.code === template.garment_type)?.name || template.garment_type;

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.item_name || addForm.default_quantity <= 0) return;
        await createItem.mutateAsync({
            template_id: templateId,
            item_id: addForm.item_id || undefined,
            item_name: addForm.item_name,
            default_quantity: addForm.default_quantity,
            unit: addForm.unit,
        });
        setAddForm({ item_id: "", item_name: "", default_quantity: 1, unit: "pieces" });
        setShowAdd(false);
    };

    const handleInventorySelect = (itemId: string) => {
        const item = inventoryItems?.find((i: any) => i.id === itemId);
        if (item) {
            setAddForm((p) => ({ ...p, item_id: itemId, item_name: item.name, unit: item.unit }));
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {template.name}
                        <Badge variant="secondary">{garmentLabel}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}

                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">Template Items</h4>
                        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </div>

                    {showAdd && (
                        <form onSubmit={handleAddItem} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">From Inventory (optional)</Label>
                                    <Select value={addForm.item_id} onValueChange={handleInventorySelect}>
                                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                                        <SelectContent>
                                            {(inventoryItems || []).map((item: any) => (
                                                <SelectItem key={item.id} value={item.id}>{item.item_code} — {item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Item Name *</Label>
                                    <Input value={addForm.item_name} onChange={(e) => setAddForm((p) => ({ ...p, item_name: e.target.value }))} placeholder="e.g. Fabric" />
                                </div>
                                <div>
                                    <Label className="text-xs">Quantity *</Label>
                                    <Input type="number" min="0.01" step="0.01" value={addForm.default_quantity} onChange={(e) => setAddForm((p) => ({ ...p, default_quantity: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div>
                                    <Label className="text-xs">Unit</Label>
                                    <Select value={addForm.unit} onValueChange={(v) => setAddForm((p) => ({ ...p, unit: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {INVENTORY_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                                <Button type="submit" size="sm" disabled={createItem.isPending || !addForm.item_name}>Add</Button>
                            </div>
                        </form>
                    )}

                    {!items || items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No items in this template</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div>
                                                <span className="font-medium">{item.item_name}</span>
                                                {item.inventory_items && (
                                                    <span className="text-xs text-muted-foreground ml-2">({item.inventory_items.item_code})</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.default_quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem.mutate(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
