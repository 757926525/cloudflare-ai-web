"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Cog, ImageIcon, LogIn, MoreHorizontal, Plus, Shield } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSettingsDialog from "@/components/admin-settings-dialog";
import LoginDialog from "@/components/login-dialog";
import LoadingIndicator from "@/components/loading-indicator";
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
  type: "today" | "last 7 days" | "last 30 days" | "earlier";
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

      let groupType: GroupedSessions["type"];
      if (diffDays === 0) {
        groupType = "today";
      } else if (diffDays <= 7) {
        groupType = "last 7 days";
      } else if (diffDays <= 30) {
        groupType = "last 30 days";
      } else {
        groupType = "earlier";
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

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/image"}>
                <Link href="/image">
                  <ImageIcon />
                  Image
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
                      <span className="text-destructive">Delete</span>
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
              <SidebarGroupLabel>{type}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sessions.map(({ id, name }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton asChild isActive={session_id === id}>
                        <a href={`/#/c/${id}`}>
                          {name}
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
                              <span className="text-destructive">Delete</span>
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
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-1">
              {isAdmin ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-primary"
                  title="Admin Settings & APIs"
                  onClick={() => setAdminDialogOpen(true)}
                >
                  <Shield className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground"
                  title="Admin Login"
                  onClick={() => setLoginDialogOpen(true)}
                >
                  <LogIn className="size-4" />
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground"
                title="Settings"
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
                <Button variant="ghost" size="sm">
                  New Chat
                  <Plus className="size-4 ml-1" />
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
              Are you sure you want to delete this session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppSidebar;
