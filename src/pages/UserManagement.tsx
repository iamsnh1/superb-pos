import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserCheck, UserMinus, Shield, Phone, Mail, Scissors, Truck } from "lucide-react";
import { useUsers, useUpdateUser, useCreateUser } from "@/hooks/useUsers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredUsers = users?.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Auto-generate generic email and password so the owner doesn't have to provide them
    const timestamp = Date.now();
    data.email = `worker_${timestamp}@superb.internal`;
    data.password = `password_${timestamp}`;
    
    createUser.mutate(data, {
      onSuccess: () => setIsAddOpen(false)
    });
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { color: string, icon: any }> = {
      admin: { color: "bg-red-100 text-red-700 border-red-200", icon: Shield },
      manager: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Shield },
      tailor: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: Scissors },
      delivery_person: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: UserCheck },
      pos_operator: { color: "bg-green-100 text-green-700 border-green-200", icon: UserCheck }
    };
    const r = roles[role] || { color: "bg-gray-100 text-gray-700", icon: UserCheck };
    return (
      <Badge variant="outline" className={`gap-1 ${r.color}`}>
        <r.icon className="w-3 h-3" />
        <span className="capitalize">{role.replace('_', ' ')}</span>
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Employee Management</h1>
            <p className="text-sm text-muted-foreground">Manage your team, roles, and attendance</p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddUser}>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>Quickly add a worker so you can assign them garments.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" name="full_name" required placeholder="John Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" placeholder="+91 9876543210" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="role">Role</Label>
                      <Select name="role" defaultValue="tailor">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tailor">Tailor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="pos_operator">POS Operator</SelectItem>
                          <SelectItem value="delivery_person">Delivery Person</SelectItem>
                          <SelectItem value="inventory_manager">Master</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="salary_type">Payment Type</Label>
                      <Select name="salary_type" defaultValue="monthly">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly Salary</SelectItem>
                          <SelectItem value="piece_rate">Piece Rate (Per Garment)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="specialization">Specialization / Skills</Label>
                      <Input id="specialization" name="specialization" placeholder="Shirts, Suits, Alterations" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="base_salary">Base Salary (₹)</Label>
                      <Input id="base_salary" name="base_salary" type="number" placeholder="15000" defaultValue="0" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">Add Worker</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Members</p>
                  <h3 className="text-2xl font-bold">{users?.filter(u => u.is_available).length || 0}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tailors</p>
                  <h3 className="text-2xl font-bold">{users?.filter(u => u.role === 'tailor').length || 0}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Staff</p>
                  <h3 className="text-2xl font-bold">{users?.filter(u => u.role === 'delivery_person').length || 0}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading team members...</TableCell></TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No team members found</TableCell></TableRow>
              ) : (
                filteredUsers?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{u.full_name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </span>
                        {u.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {u.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground italic">
                        {u.specialization || "General"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="capitalize w-fit text-xs">
                          {u.salary_type.replace('_', ' ')}
                        </Badge>
                        {u.salary_type === 'monthly' && (
                          <span className="text-xs font-semibold text-green-700">
                            ₹{Number(u.base_salary || 0).toLocaleString()} /mo
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_available ? "default" : "destructive"} className="gap-1">
                        {u.is_available ? <UserCheck className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                        {u.is_available ? "On Duty" : "Off Duty"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateUser.mutate({ id: u.id, is_available: !u.is_available })}
                      >
                        {u.is_available ? "Mark Off Duty" : "Mark On Duty"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
