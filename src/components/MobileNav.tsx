import { Link } from "react-router-dom";
import { Heart, Home, ListMusic, LogIn, LogOut, Plus, Search, ShieldCheck, Smartphone, User, X } from "lucide-react";
import { SoulLogo, type View } from "./AppSidebar";
import { SoulPointsBadge } from "./SoulPointsBadge";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  view: View;
  onSelectView: (view: View) => void;
  onUpload: () => void;
  isAdmin: boolean;
  signedIn: boolean;
  user: { firstName?: string | null; email?: string | null } | null;
  soulPoints?: number;
  onSignOut: () => void;
}

const ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "device", label: "Device storage", icon: Smartphone },
] as const;

/** Slide-in menu for phones — the hamburger's list of destinations. */
export function MobileNav({
  open,
  onClose,
  view,
  onSelectView,
  onUpload,
  isAdmin,
  signedIn,
  user,
  soulPoints = 0,
  onSignOut,
}: MobileNavProps) {
  if (!open) return null;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 animate-in fade-in bg-black/60 duration-200 md:hidden"
      />
      <nav
        aria-label="Main"
        className="fixed top-0 left-0 z-50 flex h-full w-[280px] animate-in slide-in-from-left flex-col border-r border-sidebar-border bg-sidebar duration-300 md:hidden"
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <SoulLogo />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-0.5 px-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id || (item.id === "playlists" && view === "playlist");
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {item.label}
              </button>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gold-soft transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ShieldCheck className="h-5 w-5" />
              Admin dashboard
            </Link>
          )}
        </div>

        <div className="mt-5 px-3">
          <button
            type="button"
            onClick={() => {
              onUpload();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add music
          </button>
        </div>

        <div className="mt-auto border-t border-sidebar-border p-4">
          {signedIn && user ? (
            <div className="space-y-2.5">
              <div>
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span className="truncate">{user.firstName || "Listener"}</span>
                  <SoulPointsBadge points={soulPoints} />
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/account"
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-sidebar-accent"
                >
                  <User className="h-3.5 w-3.5" /> Account
                </Link>
                <button
                  type="button"
                  aria-label="Sign out"
                  onClick={onSignOut}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-sidebar-accent"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/signin?redirect=/"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-sidebar-accent"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
