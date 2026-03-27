import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon, Building2, Receipt, Bell, Shield, Scissors, DollarSign, Download, RefreshCw } from "lucide-react";
import { GarmentSettings } from "@/components/settings/GarmentSettings";
import { useSettings, useUpdateSettings, Settings } from "@/hooks/useSettings";
import { toast } from "sonner";

function AppUpdatesPanel({ feedUrl }: { feedUrl?: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "downloading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<{ version?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const electron = typeof window !== "undefined" ? (window as any).electron : null;

  useEffect(() => {
    if (!electron?.onUpdateEvent) return;
    const unsubscribe = electron.onUpdateEvent((ev: { type: string; data?: any }) => {
      if (ev.type === "update:checking") setStatus("checking");
      if (ev.type === "update:available") {
        setStatus("available");
        setUpdateInfo(ev.data?.version ? { version: ev.data.version } : ev.data);
      }
      if (ev.type === "update:not-available") {
        setStatus("idle");
        toast.success("You are on the latest version");
      }
      if (ev.type === "update:progress") setStatus("downloading"), setProgress(ev.data?.percent ?? 0);
      if (ev.type === "update:downloaded") setStatus("ready");
      if (ev.type === "update:error") setStatus("error"), setErrorMsg(ev.data?.message || "Update failed");
    });
    return unsubscribe;
  }, [electron]);

  const handleCheck = useCallback(async () => {
    if (!electron?.checkForUpdates) return;
    setErrorMsg("");
    const feed = feedUrl?.trim();
    const res = await electron.checkForUpdates(feed);
    if (!res.ok) {
      setStatus("error");
      setErrorMsg(res.error || "Check failed");
      toast.error(res.error);
    }
  }, [electron, feedUrl]);

  const handleDownload = useCallback(async () => {
    if (!electron?.downloadUpdate) return;
    setStatus("downloading");
    const res = await electron.downloadUpdate();
    if (!res.ok) {
      setStatus("error");
      setErrorMsg(res.error || "Download failed");
    }
  }, [electron]);

  const handleInstall = useCallback(() => {
    electron?.installUpdate?.();
  }, [electron]);

  if (!electron) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCheck} disabled={status === "checking" || !feedUrl?.trim()}>
          <RefreshCw className={`h-4 w-4 mr-1 ${status === "checking" ? "animate-spin" : ""}`} />
          Check for updates
        </Button>
      </div>
      {status === "checking" && <p className="text-sm text-muted-foreground">Checking for updates…</p>}
      {status === "available" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-green-600 font-medium">Update available{updateInfo?.version ? ` (v${updateInfo.version})` : ""}</p>
          <Button size="sm" onClick={handleDownload}><Download className="h-4 w-4 mr-1" />Download update</Button>
        </div>
      )}
      {status === "downloading" && (
        <p className="text-sm text-muted-foreground">Downloading… {progress > 0 ? `${Math.round(progress)}%` : ""}</p>
      )}
      {status === "ready" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-green-600 font-medium">Update ready to install. Your data will be preserved.</p>
          <Button size="sm" onClick={handleInstall}>Restart to install</Button>
        </div>
      )}
      {status === "error" && errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState<Partial<Settings>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (key: keyof Settings, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your business preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Billing & Tax
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Receipt className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="garments" className="gap-2">
              <Scissors className="h-4 w-4" />
              Garments
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            {typeof window !== "undefined" && (window as any).electron && (
            <TabsTrigger value="updates" className="gap-2">
              <Download className="h-4 w-4" />
              App Updates
            </TabsTrigger>
            )}
            <TabsTrigger value="receipt" className="gap-2">
              <Receipt className="h-4 w-4" />
              Receipt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input value={formData.business_name || ""} onChange={e => handleChange("business_name", e.target.value)} placeholder="Your Tailoring Shop" />
                    </div>
                    <div className="space-y-2">
                      <Label>GST / Tax ID</Label>
                      <Input value={formData.gst_tax_id || ""} onChange={e => handleChange("gst_tax_id", e.target.value)} placeholder="GSTIN / Tax ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.phone || ""} onChange={e => handleChange("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={formData.email || ""} onChange={e => handleChange("email", e.target.value)} placeholder="business@example.com" />
                    </div>
                  </div>
                )}
                {isLoading ? <Skeleton className="h-10 w-full" /> : (
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={formData.address || ""} onChange={e => handleChange("address", e.target.value)} placeholder="Business address" />
                  </div>
                )}
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Billing & Tax Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input value={formData.currency_symbol || "₹"} onChange={e => handleChange("currency_symbol", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Default GST Rate (%)</Label>
                      <Input type="number" value={formData.gst_rate || "0"} onChange={e => handleChange("gst_rate", e.target.value)} placeholder="e.g. 5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Input value={formData.payment_terms || ""} onChange={e => handleChange("payment_terms", e.target.value)} placeholder="e.g. Due on receipt" />
                    </div>
                  </div>
                )}
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Order Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Order Number Prefix</Label>
                      <Input value={formData.order_number_prefix || "ORD"} onChange={e => handleChange("order_number_prefix", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Delivery Days</Label>
                      <Input type="number" value={formData.default_delivery_days || "7"} onChange={e => handleChange("default_delivery_days", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance Payment %</Label>
                      <Input type="number" value={formData.advance_payment_percent || "50"} onChange={e => handleChange("advance_payment_percent", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Urgent Surcharge %</Label>
                      <Input type="number" value={formData.urgent_surcharge_percent || "25"} onChange={e => handleChange("urgent_surcharge_percent", e.target.value)} />
                    </div>
                  </div>
                )}
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="garments">
            <GarmentSettings />
          </TabsContent>

          <TabsContent value="receipt">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Receipt Customization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Receipt Footer Text</Label>
                  <Input
                    value={formData.receipt_footer || ""}
                    onChange={e => handleChange("receipt_footer", e.target.value)}
                    placeholder="e.g. Thank you for your business!"
                  />
                  <p className="text-xs text-muted-foreground">This text appears at the very bottom of the receipt.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Show Measurements on Receipt</Label>
                    <Select
                      value={formData.show_measurements || "1"}
                      onValueChange={v => handleChange("show_measurements", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Yes, Show Details</SelectItem>
                        <SelectItem value="0">No, Hide Details</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Show Design Specs on Receipt</Label>
                    <Select
                      value={formData.show_design_specs || "1"}
                      onValueChange={v => handleChange("show_design_specs", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Yes, Show Details</SelectItem>
                        <SelectItem value="0">No, Hide Details</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save Receipt Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {typeof window !== "undefined" && (window as any).electron && (
          <TabsContent value="updates">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>App Updates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  When connected to the internet, you can receive and install updates without losing your data. Your database and settings stay intact.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Update Server URL</Label>
                  <Input
                    value={(formData as any).update_feed_url || ""}
                    onChange={e => handleChange("update_feed_url" as any, e.target.value)}
                    placeholder="https://your-server.com/releases"
                  />
                  <p className="text-xs text-muted-foreground">
                    Base URL where latest.yml and installers are hosted. Upload your release files after running <code className="text-xs bg-muted px-1 rounded">npm run build:win</code>.
                  </p>
                </div>
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save</Button>
                <hr className="my-4" />
                <AppUpdatesPanel feedUrl={(formData as any).update_feed_url || (settings as any)?.update_feed_url} />
              </CardContent>
            </Card>
          </TabsContent>
          )}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>WhatsApp Automatic Reminders</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Send trial and delivery reminders to customers on their scheduled dates.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use the <strong>Delivery & Trials → WhatsApp Reminders</strong> tab to send pre-filled messages manually. 
                  For fully automatic sending, configure a webhook below. The server runs daily at 8:00 AM and POSTs reminder data to your webhook; you can use Make.com, n8n, or a custom script with Twilio/WhatsApp API to send the messages.
                </p>
                <div className="space-y-2">
                  <Label>Reminder Webhook URL (optional)</Label>
                  <Input
                    value={(formData as any).whatsapp_reminder_webhook || ""}
                    onChange={e => handleChange("whatsapp_reminder_webhook" as any, e.target.value)}
                    placeholder="https://your-webhook.com/reminders"
                  />
                  <p className="text-xs text-muted-foreground">
                    Receives POST with trialReminders and deliveryReminders arrays. Each has customer_phone, customer_name, message, order_number, garment_type.
                  </p>
                </div>
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>Save</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
