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
            <Toaster position="top-center" richColors />

            <SidebarProvider>
              <AppSidebar />

              <SidebarInset>
                <header className="h-16 flex items-center px-4 absolute">
                  <SidebarTrigger className="-ml-1 z-10" />
                </header>

                {children}
              </SidebarInset>
            </SidebarProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
