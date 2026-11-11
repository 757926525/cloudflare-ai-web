import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import AppSidebar from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { I18nProvider } from "@/lib/i18n";
import { ThemeCustomProvider } from "@/lib/theme-custom";

export const metadata: Metadata = {
  title: "Cloudflare AI Web",
  description: "Cloudflare AI Platform with one-click deployment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="scrollbar-thumb-border scrollbar-track-transparent">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <ThemeCustomProvider>
              <Toaster position="top-center" richColors />

              <SidebarProvider>
                <AppSidebar />

                <SidebarInset>
                  <header className="h-14 flex items-center px-4 absolute w-full justify-between z-20 pointer-events-none">
                    <SidebarTrigger className="-ml-1 pointer-events-auto" />
                  </header>

                  {children}
                </SidebarInset>
              </SidebarProvider>
            </ThemeCustomProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
