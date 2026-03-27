import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalBarcodeScanner } from "@/components/GlobalBarcodeScanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <GlobalBarcodeScanner />
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-secondary/50">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out">
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-4 sm:px-6 backdrop-blur-md transition-all shrink-0">
            <SidebarTrigger className="hover:bg-accent/10 hover:text-accent transition-colors" />
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 animate-fade-in min-h-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
