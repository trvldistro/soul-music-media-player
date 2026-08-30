import { BadgeCheck, Check, Inbox, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminClaimRecord } from "@/lib/adminApi";

interface ClaimsReviewProps {
  claims: AdminClaimRecord[];
  busyName: string | null;
  errorNote: string | null;
  onApprove: (name: string) => void;
  onReject: (name: string) => void;
}

/** Pending "claim profile" applications, for the site's artist reviewers. */
export function ClaimsReview({ claims, busyName, errorNote, onApprove, onReject }: ClaimsReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl italic sm:text-4xl">Artist claims</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {claims.length === 0
            ? "Applications from artists claiming their profiles land here."
            : `${claims.length} pending ${claims.length === 1 ? "application" : "applications"}`}
        </p>
      </div>

      {errorNote && (
        <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {errorNote}
        </p>
      )}

      {claims.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No claims waiting on review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const busy = busyName === claim.name;
            return (
              <div key={claim.rowId} className="rounded-2xl border border-border/70 bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-lg italic">
                      <BadgeCheck className="h-4 w-4 text-gold-soft" /> {claim.name}
                    </p>
                    {claim.claimantEmail && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Filed by {claim.claimantEmail}
                      </p>
                    )}
                    {claim.link && (
                      <a
                        href={claim.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block truncate text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {claim.link}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-full font-semibold"
                      disabled={busy}
                      onClick={() => onApprove(claim.name)}
                    >
                      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => onReject(claim.name)}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
                <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm leading-relaxed text-muted-foreground">
                  {claim.evidence || "No evidence provided."}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
