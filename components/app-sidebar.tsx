"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Cog, ImageIcon, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const pathname = usePathname();
  const activeSessionId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("session_id") : null;

  const sessions = useLiveQuery(() => db.session.limit(100).reverse().sortBy("updatedAt"));
  const groupedSessions = sessions?.reduce((groups, session) => {
    const diffDays = Math.floor((Date.now() - new Date(session.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    const groupType: GroupedSessions["type"] = diffDays === 0 ? "today" : diffDays <= 7 ? "last 7 days" : diffDays <= 30 ? "last 30 days" : "earlier";
    const group = groups.find((item) => item.type === groupType);
    if (group) group.sessions.push(session);
    else groups.push({ type: groupType, sessions: [session] });
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
                <Link href="/image"><ImageIcon />Image<LoadingIndicator className="ml-auto" /></Link>
              </SidebarMenuButton>
              {pathname === "/image" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><SidebarMenuAction><MoreHorizontal /></SidebarMenuAction></DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={() => { setDeleteConfirmOpen(true); setSessionId("image"); }}><span className="text-destructive">Delete</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="scrollbar">
          {groupedSessions.map(({ type, sessions: grouped }) => (
            <SidebarGroup key={type}>
              <SidebarGroupLabel>{type}</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>
                {grouped.map(({ id, name }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton asChild isActive={activeSessionId === id}>
                      <Link href={`/c?session_id=${encodeURIComponent(id)}`}>{name}<LoadingIndicator className="ml-auto" /></Link>
                    </SidebarMenuButton>
                    {activeSessionId === id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><SidebarMenuAction><MoreHorizontal /></SidebarMenuAction></DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem onClick={() => { setDeleteConfirmOpen(true); setSessionId(id); }}><span className="text-destructive">Delete</span></DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter><SidebarMenu><SidebarMenuItem className="flex items-center">
          <Button size="icon" variant="ghost" className="size-8" disabled><Cog /></Button>
          <Link href="/" className="ml-auto"><Button variant="ghost">New Chat<Plus /></Button></Link>
        </SidebarMenuItem></SidebarMenu></SidebarFooter>
      </Sidebar>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure you want to delete this session?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppSidebar;
