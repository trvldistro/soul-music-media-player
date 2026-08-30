import { useState } from "react";
import { BadgeCheck, Loader2, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitArtistClaim } from "@/lib/queries";

interface ClaimArtistDialogProps {
  /** Artist name to claim; null closes the dialog. */
  artistName: string | null;
  /** True when a claim row exists in "unclaimed" state after a rejection. */
  reclaim?: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Claim profile / Verify as artist" application. Submitting files a claim for
 * review by the site's artist reviewers.
 */
export function ClaimArtistDialog({ artistName, reclaim = false, onOpenChange }: ClaimArtistDialogProps) {
  const open = artistName !== null;
  const submit = useSubmitArtistClaim();
  const [evidence, setEvidence] = useState("");
  const [link, setLink] = useState("");
  const [done, setDone] = useState(false);

  const evidenceValid = evidence.trim().length >= 10;
  const linkTrimmed = link.trim();

  function reset() {
    setEvidence("");
    setLink("");
    setDone(false);
    submit.reset();
  }

  function handleSubmit() {
    if (!artistName || !evidenceValid) return;
    submit.mutate(
      { name: artistName, evidence: evidence.trim(), link: linkTrimmed, reclaim },
      {
        onSuccess: (result) => {
          if (result.outcome === "succeeded") {
            setDone(true);
          } else if (result.code === "Conflict") {
            toast.error("A claim for this artist is already filed or in review.");
          } else {
            toast.error(result.userMessage || "Could not submit the claim. Try again.");
          }
        },
        onError: (err) =>
          toast.error(
            err instanceof Error && err.message ? err.message : "Could not submit the claim. Try again.",
          ),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        {!done ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl italic">
                <ShieldQuestion className="h-5 w-5 text-primary" /> Claim “{artistName}”
              </DialogTitle>
              <DialogDescription>
                Apply to verify this profile as the real artist. Our reviewers check every claim
                before a profile gets the verified badge.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="claim-evidence">Why is this profile yours?</Label>
                <Textarea
                  id="claim-evidence"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Tell us how we can confirm you're this artist…"
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-[11px] text-muted-foreground">
                  {evidence.trim().length < 10
                    ? "At least 10 characters."
                    : `${1000 - evidence.length} characters left`}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-link">Proof link (optional)</Label>
                <Input
                  id="claim-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Instagram, YouTube, Spotify…"
                  maxLength={300}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-full font-semibold"
                disabled={!evidenceValid || submit.isPending}
                onClick={handleSubmit}
              >
                {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit claim
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BadgeCheck className="h-7 w-7" />
            </span>
            <DialogTitle className="font-display text-xl italic">Claim submitted</DialogTitle>
            <DialogDescription>
              Your claim for “{artistName}” is in review. Once approved, the profile carries the
              verified artist badge.
            </DialogDescription>
            <Button className="mt-2 rounded-full font-semibold" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
