"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Cog, ImageIcon, LogIn, MoreHorizontal, Plus, Shield, MessageSquare, Languages } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSettingsDialog from "@/components/admin-settings-dialog";
import LoginDialog from "@/components/login-dialog";
import LoadingIndicator from "@/components/loading-indicator";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { db, type Session } from "@/lib/db";

interface GroupedSessions {
  type: string;
  sessions: Session[];
}

const AppSidebar = () => {
  const { session_id } = useParams();
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const pathname = usePathname();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { lang, setLang, t } = useI18n();

  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(localStorage.getItem("CF_AI_IS_ADMIN") === "true");
    };
    checkAuth();
    window.addEventListener("auth-changed", checkAuth);
    return () => window.removeEventListener("auth-changed", checkAuth);
  }, []);

  const sessions = useLiveQuery(() =>
    db.session.limit(100).reverse().sortBy("updatedAt"),
  );

  const groupedSessions =
    sessions?.reduce((groups, session) => {
      const now = new Date();
      const updatedAt = new Date(session.updatedAt);
      const diffTime = now.getTime() - updatedAt.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let groupType: string;
      if (diffDays === 0) {
        groupType = lang === "zh" ? "今天" : "Today";
      } else if (diffDays <= 7) {
        groupType = lang === "zh" ? "最近 7 天" : "Last 7 Days";
      } else if (diffDays <= 30) {
        groupType = lang === "zh" ? "最近 30 天" : "Last 30 Days";
      } else {
        groupType = lang === "zh" ? "更早以前" : "Earlier";
      }

      const group = groups.find((g) => g.type === groupType);
      if (group) {
        group.sessions.push(session);
      } else {
        groups.push({ type: groupType, sessions: [session] });
      }
      return groups;
    }, [] as GroupedSessions[]) ?? [];

  const handleDelete = async () => {
    await db.transaction("rw", db.session, db.message, async () => {
      await db.session.delete(sessionId);
      await db.message.where("sessionId").equals(sessionId).delete();
    });
    setDeleteConfirmOpen(false);
    router.push("/");
  };

  const toggleLanguage = () => {
    setLang(lang === "zh" ? "en" : "zh");
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/image"}>
                <Link href="/image" className="font-medium text-xs">
                  <ImageIcon className="size-4" />
                  {t("imageGen")}
                  <LoadingIndicator className="ml-auto" />
                </Link>
              </SidebarMenuButton>

              {pathname === "/image" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction>
                      <MoreHorizontal />
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      onClick={() => {
                        setDeleteConfirmOpen(true);
                        setSessionId("image");
                      }}
                    >
                      <span className="text-destructive">{t("clearHistory")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="scrollbar">
          {groupedSessions.map(({ type, sessions }) => (
            <SidebarGroup key={type}>
              <SidebarGroupLabel className="text-xs font-semibold">{type}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sessions.map(({ id, name }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton asChild isActive={session_id === id}>
                        <a href={`/#/c/${id}`} className="text-xs">
                          <MessageSquare className="size-3.5 opacity-70" />
                          <span className="truncate">{name}</span>
                          <LoadingIndicator className="ml-auto" />
                        </a>
                      </SidebarMenuButton>

                      {session_id === id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction>
                              <MoreHorizontal />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleteConfirmOpen(true);
                                setSessionId(id);
                              }}
                            >
                              <span className="text-destructive">{t("deleteChat")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-1">
              {/* 中英文切换按钮 */}
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground font-mono text-xs"
                title={lang === "zh" ? "Switch to English" : "切换为中文"}
                onClick={toggleLanguage}
              >
                <Languages className="size-4" />
              </Button>

              {isAdmin ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-primary"
                  title={t("adminSettings")}
                  onClick={() => setAdminDialogOpen(true)}
                >
                  <Shield className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground"
                  title={t("adminLogin")}
                  onClick={() => setLoginDialogOpen(true)}
                >
                  <LogIn className="size-4" />
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground"
                title={t("settings")}
                onClick={() => {
                  if (isAdmin) {
                    setAdminDialogOpen(true);
                  } else {
                    setLoginDialogOpen(true);
                  }
                }}
              >
                <Cog className="size-4" />
              </Button>

              <Link href="/" className="ml-auto">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                  {t("newChat")}
                  <Plus className="size-3.5 ml-1" />
                </Button>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AdminSettingsDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
      />

      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onLoginSuccess={() => {
          setIsAdmin(true);
          setAdminDialogOpen(true);
        }}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppSidebar;
