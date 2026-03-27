import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function GlobalBarcodeScanner() {
  const navigate = useNavigate();

  useEffect(() => {
    let barcode = "";
    let lastTime = 0;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or select element
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        return;
      }

      const now = Date.now();
      
      // Hardware barcode scanners type extremely fast (usually < 30ms between characters).
      // If the time between keystrokes is more than 60ms, it's likely a human typing manually.
      if (now - lastTime > 80) {
        barcode = "";
      }

      // Barcode scanners usually end with an "Enter" command
      if (e.key === "Enter" && barcode.length >= 6) {
        const scannedCode = barcode.trim();
        barcode = ""; // Reset immediately
        
        try {
          toast.loading(`Scanning: ${scannedCode}...`, { id: "scanner" });
          
          // Request orders matching this exact barcode
          const response = await api.get(`/orders?search=${encodeURIComponent(scannedCode)}`);
          const orders = response?.orders || response || [];
          
          if (orders && orders.length > 0) {
            // Find an exact order_number match if multiple results came back from broader search
            const exactMatch = orders.find((o: any) => o.order_number === scannedCode);
            const targetOrder = exactMatch || orders[0];
            
            toast.success(`Found Order: ${targetOrder.order_number}`, { id: "scanner" });
            
            // Navigate straight into the order details
            navigate(`/orders/${targetOrder.id}`);
          } else {
            toast.error(`Order not found for code: ${scannedCode}`, { id: "scanner" });
          }
        } catch (err: any) {
          toast.error(`Scanner error: ${err.message}`, { id: "scanner" });
        }
      } 
      // Capture standard alphanumeric characters & hyphens commonly found in barcodes/QRs
      else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcode += e.key;
      }
      
      lastTime = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null; // Silent global utility
}
