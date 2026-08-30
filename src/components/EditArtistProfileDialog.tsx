import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { content } from "@/lib/shared/kliv-content.js";
import { useSaveArtistProfile } from "@/lib/queries";
import {
  BIO_MAX_LENGTH,
  LINK_PLATFORMS,
  MAX_LINKS,
  PHOTO_MAX_BYTES,
  isHttpUrl,
  linkLabel,
  sanitizeBio,
  sanitizeLinks,
  type ArtistLink,
} from "@/lib/artistProfile";
import type { ArtistProfileExtra } from "@/lib/types";

interface EditArtistProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistName: string;
  currentUserId: string | null;
  extra: ArtistProfileExtra | null;
}

const PHOTO_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp";

/**
 * The verified artist's own profile editor. Bio, photo and links are all
 * optional — an artist can keep an empty page if they prefer.
 */
export function EditArtistProfileDialog({
  open,
  onOpenChange,
  artistName,
  currentUserId,
  extra,
}: EditArtistProfileDialogProps) {
  const { mutateAsync: saveProfile, reset: resetSave } = useSaveArtistProfile();
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [links, setLinks] = useState<ArtistLink[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBio(extra?.bio ?? "");
    setImageUrl(extra?.imageUrl ?? "");
    setLinks(extra?.links ? [...extra.links] : []);
    setPhotoFile(null);
    setPhotoPreview(null);
    resetSave();
  }, [open, extra, resetSave]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Profile photos must be images");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("That photo is too big", { description: "Keep it under 5 MB." });
      return;
    }
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setImageUrl("");
  }

  function updateLink(index: number, patch: Partial<ArtistLink>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLink() {
    if (links.length >= MAX_LINKS) return;
    const used = new Set(links.map((l) => l.platform));
    const next = LINK_PLATFORMS.find((p) => !used.has(p.key))?.key ?? "website";
    setLinks((prev) => [...prev, { platform: next, url: "" }]);
  }

  async function handleSave() {
    const typed = links.filter((l) => l.url.trim());
    const invalid = typed.filter((l) => !isHttpUrl(l.url));
    if (invalid.length > 0) {
      toast.error("One of the links isn't a full web address", {
        description: `${linkLabel(invalid[0].platform)} needs an address like https://…`,
      });
      return;
    }
    setBusy(true);
    try {
      let nextImage = imageUrl;
      if (photoFile) {
        const uploaded = await content.uploadFile(photoFile, "artists");
        nextImage = uploaded.path;
      }
      await saveProfile({
        name: artistName,
        bio: sanitizeBio(bio),
        imageUrl: nextImage,
        links: sanitizeLinks(links),
        userId: currentUserId,
      });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save your profile", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  }

  const shownPhoto = photoPreview ?? (imageUrl || null);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">Edit your profile</DialogTitle>
          <DialogDescription>
            Everything here is optional — share what you want your listeners to see.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {shownPhoto ? (
              <img
                src={shownPhoto}
                alt="Profile photo"
                className="h-16 w-16 rounded-full border border-border object-cover shadow"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="artist-photo" className="text-sm">
                Profile photo
              </Label>
              <p className="text-xs text-muted-foreground">Square images look best. Optional.</p>
              <div className="flex items-center gap-2">
                <Input
                  id="artist-photo"
                  ref={photoInputRef}
                  type="file"
                  accept={PHOTO_ACCEPT}
                  onChange={pickPhoto}
                  className="h-9 text-xs"
                />
                {shownPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-full px-2.5"
                    aria-label="Remove photo"
                    onClick={removePhoto}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="artist-bio">Bio</Label>
            <Textarea
              id="artist-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              maxLength={BIO_MAX_LENGTH}
              placeholder="Tell your listeners who you are…"
            />
            <p className="text-[11px] text-muted-foreground">
              {bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Social & streaming links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={addLink}
                disabled={links.length >= MAX_LINKS}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add link
              </Button>
            </div>
            {links.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
                Pin your Instagram, Spotify, Apple Music, Boomplay, Audiomack and more — they show as
                buttons on your page.
              </p>
            ) : (
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={link.platform} onValueChange={(v) => updateLink(i, { platform: v })}>
                      <SelectTrigger className="w-[150px] shrink-0" aria-label={`Platform for link ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {LINK_PLATFORMS.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(i, { url: e.target.value })}
                      placeholder="https://…"
                      inputMode="url"
                      aria-label={`${linkLabel(link.platform)} address`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 rounded-full px-2.5"
                      aria-label={`Remove ${linkLabel(link.platform)} link`}
                      onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button className="rounded-full font-semibold" onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {busy ? "Saving…" : "Save profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
