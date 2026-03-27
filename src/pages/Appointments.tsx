import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, User, Shirt,
  Check, X, AlertTriangle, MessageCircle
} from "lucide-react";

interface Appointment {
  id: number;
  order_id: number;
  customer_id: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  type: string;
  status: string;
  notes: string;
  order_number: string;
  garment_type: string;
  customer_name: string;
  customer_phone: string;
}

const STATUS_CONFIG: Record<string, { label: string; colors: string; dot: string }> = {
  scheduled:  { label: "Scheduled",  colors: "bg-blue-100 text-blue-800 border-blue-200",    dot: "bg-blue-500" },
  confirmed:  { label: "Confirmed",  colors: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" },
  completed:  { label: "Done",       colors: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  cancelled:  { label: "Cancelled",  colors: "bg-red-100 text-red-800 border-red-200",       dot: "bg-red-400" },
  no_show:    { label: "No Show",    colors: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-400" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; bgColor: string; textColor: string }> = {
  measurement:    { label: "Measurement",    icon: "📏", bgColor: "bg-violet-50",  textColor: "text-violet-700" },
  first_fitting:  { label: "First Fitting",  icon: "🧵", bgColor: "bg-blue-50",    textColor: "text-blue-700" },
  alteration:     { label: "Alteration",     icon: "✂️", bgColor: "bg-amber-50",   textColor: "text-amber-700" },
  final_fitting:  { label: "Final Fitting",  icon: "✨", bgColor: "bg-emerald-50", textColor: "text-emerald-700" },
};

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const businessName = settings?.business_name || "Superb Tailors";

  const [formOrderId, setFormOrderId] = useState("");
  const [formDate, setFormDate] = useState(selectedDate);
  const [formTime, setFormTime] = useState("10:00");
  const [formType, setFormType] = useState("first_fitting");
  const [formNotes, setFormNotes] = useState("");

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["appointments", selectedDate],
    queryFn: () => api.get<{ appointments: Appointment[] }>(`/appointments?date=${selectedDate}`),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-for-appointment"],
    queryFn: () => api.get<{ orders: any[] }>("/orders?limit=200&status=pending,in_production,first_fitting,alterations"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowNewDialog(false);
      resetForm();
      toast({ title: "✅ Appointment booked", description: "Fitting has been scheduled." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Status updated" });
    },
  });

  const resetForm = () => {
    setFormOrderId(""); setFormDate(selectedDate);
    setFormTime("10:00"); setFormType("first_fitting"); setFormNotes("");
  };

  // Generate week days
  const getWeekDays = () => {
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7 - start.getDay() + 1); // Mon start
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const todayStr = new Date().toISOString().split("T")[0];
  const appointments = (appointmentsData?.appointments || []).sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time)
  );

  const timeSlots: string[] = [];
  for (let h = 9; h <= 19; h++) {
    for (const m of ["00", "30"]) {
      if (h === 19 && m === "30") continue;
      timeSlots.push(`${String(h).padStart(2, "0")}:${m}`);
    }
  }

  const handleWhatsApp = (apt: Appointment) => {
    if (!apt.customer_phone) { toast({ title: "No phone number", variant: "destructive" }); return; }
    const cleaned = apt.customer_phone.replace(/[^0-9]/g, '');
    const phone = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    const typeLabel = TYPE_CONFIG[apt.type]?.label || apt.type;
    const msg = `Hi ${apt.customer_name},\n\nYour *${typeLabel}* appointment for order *${apt.order_number}* (${apt.garment_type}) is scheduled for *${new Date(apt.appointment_date + 'T12:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })} at ${apt.appointment_time}*.\n\nPlease visit us on time. Thank you! — ${businessName}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // "Today's Work" board — what the staff needs to prepare
  const todayAppointments = appointments.filter(a => a.appointment_date === selectedDate && a.status !== 'cancelled' && a.status !== 'no_show');
  const needsIroning = todayAppointments.filter(a => ['final_fitting', 'first_fitting'].includes(a.type) && a.status !== 'completed');

  const selectedDateObj = new Date(selectedDate + "T12:00:00");

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">🗓️</span> Fitting Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Schedule trial & fitting appointments for your customers.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setFormDate(selectedDate); setShowNewDialog(true); }} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Book Fitting
          </Button>
        </div>

        {/* Monday Ops Banner (only for today) */}
        {selectedDate === todayStr && needsIroning.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <span className="text-2xl shrink-0">👔</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Today's Prep Alert</p>
              <p className="text-amber-700 text-sm mt-0.5">
                <strong>{needsIroning.length}</strong> garment(s) need to be <strong>ironed and kept at the front desk</strong> for today's fittings:
                {" "}{needsIroning.map(a => <span key={a.id} className="inline-block mx-0.5 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-xs font-mono font-bold">{a.order_number}</span>)}
              </p>
            </div>
          </div>
        )}

        {/* Week Strip */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">
                  {weekDays[0].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                {weekOffset !== 0 && (
                  <button onClick={() => setWeekOffset(0)} className="text-xs text-primary underline">Today</button>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(day => {
                const dateStr = day.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const dayName = day.toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex flex-col items-center rounded-xl py-2.5 px-1 transition-all duration-200 text-center
                      ${isSelected
                        ? "bg-primary text-primary-foreground shadow-md scale-[1.05]"
                        : isToday
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "hover:bg-muted text-foreground"
                      }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{dayName}</span>
                    <span className="text-lg font-extrabold mt-0.5">{day.getDate()}</span>
                    {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-primary mt-1" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day's appointments */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">
              {selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <Badge variant="secondary" className="font-semibold">
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : appointments.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Calendar className="h-14 w-14 mb-4 opacity-20" />
                <p className="font-semibold text-base">No appointments on this day</p>
                <p className="text-sm mt-1">Click "Book Fitting" to schedule one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appointments.map(apt => {
                const typeConf = TYPE_CONFIG[apt.type] || { label: apt.type, icon: "📎", bgColor: "bg-muted", textColor: "text-foreground" };
                const statusConf = STATUS_CONFIG[apt.status] || { label: apt.status, colors: "bg-muted", dot: "bg-gray-400" };
                const isActive = !['completed', 'cancelled', 'no_show'].includes(apt.status);

                return (
                  <Card key={apt.id} className={`hover:shadow-md transition-all duration-200 overflow-hidden border ${apt.status === 'completed' ? 'opacity-60' : ''}`}>
                    {/* Color accent strip based on type */}
                    <div className={`h-1 w-full ${
                      apt.type === 'final_fitting' ? 'bg-emerald-400' :
                      apt.type === 'first_fitting' ? 'bg-blue-400' :
                      apt.type === 'alteration' ? 'bg-amber-400' : 'bg-violet-400'
                    }`} />
                    <CardContent className="p-4">
                      {/* Time + Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-extrabold text-lg">{apt.appointment_time}</span>
                          <span className="text-xs text-muted-foreground">({apt.duration_minutes}min)</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConf.colors}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </div>

                      {/* Type badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold mb-3 ${typeConf.bgColor} ${typeConf.textColor}`}>
                        <span>{typeConf.icon}</span> {typeConf.label}
                      </div>

                      {/* Customer & Order */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold truncate">{apt.customer_name}</span>
                          {apt.customer_phone && <span className="text-muted-foreground text-xs shrink-0">·{apt.customer_phone}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Shirt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs font-bold text-primary">{apt.order_number}</span>
                          <span className="text-muted-foreground truncate">— {apt.garment_type}</span>
                        </div>
                      </div>

                      {apt.notes && (
                        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 mb-3 italic">"{apt.notes}"</p>
                      )}

                      {/* Actions */}
                      <div className="space-y-2">
                        {apt.status === "scheduled" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                              onClick={() => statusMutation.mutate({ id: apt.id, status: "confirmed" })}>
                              <Check className="h-3 w-3" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => statusMutation.mutate({ id: apt.id, status: "cancelled" })}>
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        )}
                        {apt.status === "confirmed" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => statusMutation.mutate({ id: apt.id, status: "completed" })}>
                              <Check className="h-3 w-3" /> Done ✓
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                              onClick={() => statusMutation.mutate({ id: apt.id, status: "no_show" })}>
                              <AlertTriangle className="h-3 w-3" /> No Show
                            </Button>
                          </div>
                        )}
                        {isActive && (
                          <Button
                            size="sm" variant="ghost"
                            className="w-full text-xs text-green-700 hover:bg-green-50 gap-1"
                            onClick={() => handleWhatsApp(apt)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Send WhatsApp Reminder
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Book Appointment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" /> Book Fitting Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Order <span className="text-destructive">*</span></Label>
              <Select value={formOrderId} onValueChange={setFormOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an active order..." />
                </SelectTrigger>
                <SelectContent>
                  {(ordersData?.orders || []).map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      <span className="font-mono text-primary font-bold">{o.order_number}</span> — {o.customer_name} ({o.garment_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} min={todayStr} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Time <span className="text-destructive">*</span></Label>
                <Select value={formTime} onValueChange={setFormTime}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Appointment Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormType(key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      formType === key
                        ? `${conf.bgColor} ${conf.textColor} border-current`
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-base">{conf.icon}</span>
                    {conf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="E.g. Bring original fabric swatch, check sleeve length..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button
              disabled={!formOrderId || !formDate || !formTime || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  order_id: Number(formOrderId),
                  appointment_date: formDate,
                  appointment_time: formTime,
                  type: formType,
                  notes: formNotes || undefined,
                })
              }
            >
              {createMutation.isPending ? "Booking..." : "✓ Book Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
