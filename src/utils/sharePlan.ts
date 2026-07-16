// Share-link codec for the building planner. A plan is the total ticks
// invested per building, positionally matched to BUILDING_ORDER (see
// utils/buildings.ts — that list is append-only for this reason). Totals are
// LEB128 varint-packed behind a version byte and base64url-encoded, so a
// full plan fits in a ~60-character URL fragment.

const VERSION = 1;

/** Encode per-building totals (BUILDING_ORDER positions) into a URL-safe payload. */
export function encodeTotals(totals: number[]): string {
  // Trailing zeros are the default state — drop them.
  let end = totals.length;
  while (end > 0 && totals[end - 1] === 0) end--;

  const bytes: number[] = [VERSION];
  for (let i = 0; i < end; i++) {
    let v = Math.max(0, Math.floor(totals[i]));
    do {
      bytes.push(v > 0x7f ? (v & 0x7f) | 0x80 : v);
      v >>>= 7;
    } while (v > 0);
  }
  return toBase64Url(bytes);
}

/** Decode a payload back into totals. Returns null on any malformed input. */
export function decodeTotals(payload: string): number[] | null {
  const bytes = fromBase64Url(payload);
  if (!bytes || bytes.length === 0 || bytes[0] !== VERSION) return null;

  const totals: number[] = [];
  let v = 0;
  let shift = 0;
  for (let i = 1; i < bytes.length; i++) {
    if (shift > 28) return null; // value too large to be a real plan
    v |= (bytes[i] & 0x7f) << shift;
    if (bytes[i] & 0x80) {
      shift += 7;
    } else {
      totals.push(v >>> 0);
      v = 0;
      shift = 0;
    }
  }
  if (shift !== 0) return null; // truncated varint
  return totals;
}

function toBase64Url(bytes: number[]): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Extract and decode a #plan= payload from a URL hash, or null. */
export function planFromHash(hash: string): number[] | null {
  const m = hash.match(/[#&]plan=([A-Za-z0-9_-]+)/);
  return m ? decodeTotals(m[1]) : null;
}

// Captured at module load: App.tsx's URL-sync effect rewrites the URL via
// history.replaceState and strips the hash before the planner (which waits on
// async building data) gets a chance to read it.
export const INITIAL_SHARED_TOTALS: number[] | null = planFromHash(window.location.hash);
