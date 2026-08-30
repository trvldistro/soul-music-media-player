import { Link } from "react-router-dom";
import { Heart, Home, ListMusic, LogIn, LogOut, Plus, Search, ShieldCheck, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Playlist } from "@/lib/types";
import { isAdminEmail } from "@/lib/admin";
import { SoulPointsBadge } from "./SoulPointsBadge";

export type View = "home" | "search" | "favorites" | "playlists" | "playlist" | "artist" | "device";

interface AppSidebarProps {
  view: View;
  onSelectView: (view: View) => void;
  playlists: Playlist[];
  activePlaylistId: number | null;
  onSelectPlaylist: (id: number) => void;
  onUpload: () => void;
  onNewPlaylist: () => void;
  user: { firstName?: string | null; email?: string | null } | null;
  soulPoints?: number;
  onSignOut: () => void;
}

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "device", label: "Device storage", icon: Smartphone },
] as const;

export function SoulLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className={cn("shrink-0", compact ? "h-8 w-8" : "h-9 w-9")} aria-hidden>
        <circle cx="32" cy="32" r="29" fill="#191320" />
        <circle cx="32" cy="32" r="29" fill="none" stroke="#f0a83c" strokeOpacity="0.35" />
        <circle cx="32" cy="32" r="21" fill="none" stroke="#f0a83c" strokeOpacity="0.18" />
        <circle cx="32" cy="32" r="12" fill="#f0a83c" />
        <circle cx="32" cy="32" r="3.5" fill="#0e0a10" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <p className="font-display text-[1.35rem] font-black italic tracking-tight text-foreground">SOUL</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.42em] text-muted-foreground">music</p>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  view,
  onSelectView,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onUpload,
  onNewPlaylist,
  user,
  soulPoints = 0,
  onSignOut,
}: AppSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="px-5 pt-6 pb-3">
        <SoulLogo />
      </div>

      <nav aria-label="Main" className="space-y-0.5 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </button>
          );
        })}
        {isAdminEmail(user?.email) && (
          <Link
            to="/admin"
            aria-current={"page"}
            className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent/60 px-3 py-2 text-sm font-medium text-gold-soft transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ShieldCheck className="h-4 w-4" />
            Admin dashboard
          </Link>
        )}
      </nav>

      <div className="mt-5 px-3">
        <Button
          onClick={onUpload}
          className="w-full rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add music
        </Button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your playlists
          </p>
          <button
            aria-label="New playlist"
            onClick={onNewPlaylist}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {playlists.length === 0 ? (
          <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">
            {user
              ? "Create your first mix — it lives here."
              : "Sign in to keep your own playlists."}
          </p>
        ) : (
          playlists.map((pl) => {
            const active = view === "playlist" && activePlaylistId === pl.rowId;
            return (
              <button
                key={pl.rowId}
                onClick={() => onSelectPlaylist(pl.rowId)}
                className={cn(
                  "flex w-full items-center gap-2.5 truncate rounded-lg px-2.5 py-2 text-left text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <ListMusic className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{pl.name}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              {(user.firstName ?? user.email ?? "S").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                <span className="truncate">{user.firstName || "Listener"}</span>
                <SoulPointsBadge points={soulPoints} />
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Link
              to="/account"
              aria-label="Account"
              className="rounded-full p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
            >
              <User className="h-4 w-4" />
            </Link>
            <button
              aria-label="Sign out"
              onClick={onSignOut}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/signin?redirect=/">
              <LogIn className="mr-1.5 h-4 w-4" /> Sign in
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
