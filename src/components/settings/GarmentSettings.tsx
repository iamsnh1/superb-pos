import { useState } from "react";
import { useGarmentTemplates, useCreateGarmentTemplate, useUpdateGarmentTemplate, useDeleteGarmentTemplate } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, X } from "lucide-react";

export function GarmentSettings() {
    const { data: templates, isLoading } = useGarmentTemplates();
    const createTemplate = useCreateGarmentTemplate();
    const updateTemplate = useUpdateGarmentTemplate();
    const deleteTemplate = useDeleteGarmentTemplate();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [basePrice, setBasePrice] = useState("0");
    const [fields, setFields] = useState<{ key: string, label: string, unit: string }[]>([]);
    const [styles, setStyles] = useState<string[]>([]);

    const handleOpen = (template?: any) => {
        if (template) {
            setEditingId(template.id);
            setName(template.name);
            setBasePrice(template.base_price?.toString() || "0");
            setFields(template.measurement_fields || []);
            setStyles(template.styles || []);
        } else {
            setEditingId(null);
            setName("");
            setBasePrice("0");
            setFields([{ key: "", label: "", unit: "in" }]);
            setStyles([]);
        }
        setOpen(true);
    };

    const handleSave = async () => {
        const payload = {
            name,
            base_price: parseFloat(basePrice) || 0,
            measurement_fields: fields.filter(f => f.label), // filter empty
            styles
        };

        if (editingId) {
            await updateTemplate.mutateAsync({ id: editingId, ...payload });
        } else {
            await createTemplate.mutateAsync({
                name,
                code: name.toLowerCase().replace(/\s+/g, "_"),
                base_price: payload.base_price,
                measurement_fields: payload.measurement_fields,
                styles: payload.styles
            });
        }
        setOpen(false);
    };

    const addField = () => setFields([...fields, { key: "", label: "", unit: "in" }]);
    const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
    const updateField = (index: number, key: keyof typeof fields[0], value: string) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: value };
        // Auto-generate key from label if key is empty
        if (key === 'label' && !newFields[index].key) {
            newFields[index].key = value.toLowerCase().replace(/\s+/g, "_");
        }
        setFields(newFields);
    };

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Garment Types & Measurements</CardTitle>
                <Button onClick={() => handleOpen()}>
                    <Plus className="w-4 h-4 mr-2" /> Add New Type
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Base Price</TableHead>
                            <TableHead>Measurement Fields</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates?.map((t: any) => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.name}</TableCell>
                                <TableCell>₹{t.base_price || 0}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {t.measurement_fields.map((f: any) => (
                                            <Badge key={f.key} variant="secondary" className="text-xs">
                                                {f.label} ({f.unit})
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpen(t)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Garment Type" : "Add Garment Type"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Garment Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Safari Suit" />
                            </div>

                            <div>
                                <Label>Base Price (₹)</Label>
                                <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0.00" />
                            </div>

                            <div className="space-y-4 pt-2 border-t mt-4">
                                <Label className="text-sm font-bold">Preloaded Styles</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="newStyleInput"
                                        placeholder="e.g. Slim Fit, Puna, etc."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val && !styles.includes(val)) {
                                                    setStyles([...styles, val]);
                                                    (e.target as HTMLInputElement).value = "";
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const input = document.getElementById('newStyleInput') as HTMLInputElement;
                                            const val = input.value.trim();
                                            if (val && !styles.includes(val)) {
                                                setStyles([...styles, val]);
                                                input.value = "";
                                            }
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {styles.map((style, idx) => (
                                        <Badge key={idx} variant="secondary" className="pl-3 py-1 gap-1">
                                            {style}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
                                                onClick={() => setStyles(styles.filter((_, i) => i !== idx))}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                    {styles.length === 0 && <p className="text-xs text-muted-foreground italic">No preloaded styles added yet.</p>}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Measurement Parameters</Label>
                                    <Button variant="outline" size="sm" onClick={addField}><Plus className="w-3 h-3 mr-1" /> Add Field</Button>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {fields.map((field, i) => (
                                        <div key={i} className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <Label className="text-xs">Label</Label>
                                                <Input value={field.label} onChange={e => updateField(i, 'label', e.target.value)} placeholder="e.g. Chest" />
                                            </div>
                                            <div className="w-24">
                                                <Label className="text-xs">Unit</Label>
                                                <Input value={field.unit} onChange={e => updateField(i, 'unit', e.target.value)} placeholder="in/cm" />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Key (Auto)</Label>
                                                <Input value={field.key} onChange={e => updateField(i, 'key', e.target.value)} placeholder="chest" />
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => removeField(i)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button className="w-full" onClick={handleSave} disabled={!name}>Save Garment Type</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
