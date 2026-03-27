import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryItems, useCategories, useCreateInventoryItem, useCreateCategory } from "@/hooks/useInventory";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: items, isLoading } = useInventoryItems(categoryId === "all" ? undefined : categoryId, search);
  const { data: categories } = useCategories();
  const createItem = useCreateInventoryItem();

  // Add Item Form State
  const [newItem, setNewItem] = useState({
    name: "", item_code: "", category_id: "", unit: "pieces",
    initial_quantity: 0, reorder_level: 5, description: ""
  });

  const handleCreate = async () => {
    await createItem.mutateAsync({
      name: newItem.name,
      category_id: newItem.category_id ? parseInt(newItem.category_id) : undefined,
      unit: newItem.unit,
      initial_quantity: newItem.initial_quantity,
      reorder_level: newItem.reorder_level,
      description: newItem.description
    });
    setIsAddOpen(false);
    setNewItem({ name: "", item_code: "", category_id: "", unit: "pieces", initial_quantity: 0, reorder_level: 5, description: "" });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground">Manage fabrics, materials, and stock levels</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Blue Cotton Fabric" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newItem.category_id} onValueChange={v => setNewItem({ ...newItem, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={newItem.unit} onValueChange={v => setNewItem({ ...newItem, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="meters">Meters</SelectItem>
                        <SelectItem value="yards">Yards</SelectItem>
                        <SelectItem value="spools">Spools</SelectItem>
                        <SelectItem value="buttons">Buttons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Initial Stock</Label>
                    <Input type="number" value={newItem.initial_quantity} onChange={e => setNewItem({ ...newItem, initial_quantity: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Reorder Level</Label>
                    <Input type="number" value={newItem.reorder_level} onChange={e => setNewItem({ ...newItem, reorder_level: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                </div>
                <Button onClick={handleCreate} disabled={!newItem.name || createItem.isPending} className="w-full">
                  {createItem.isPending ? "Creating..." : "Create Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-sm p-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(categories || []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items || []).map((item: any) => {
                const available = item.stock_quantity - item.reserved_quantity;
                const isLow = available <= item.reorder_level;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category_name || "-"}</TableCell>
                    <TableCell>{item.stock_quantity} {item.unit}</TableCell>
                    <TableCell className="text-orange-600 font-medium">{item.reserved_quantity}</TableCell>
                    <TableCell className={available < 0 ? "text-destructive font-bold" : ""}>
                      {available} {item.unit}
                    </TableCell>
                    <TableCell>
                      {isLow && (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!items || items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
