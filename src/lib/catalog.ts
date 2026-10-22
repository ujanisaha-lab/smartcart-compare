// Store directory + pure price helpers (browser-safe). Live prices come from prices.functions.ts.
export type Store = {
  id: string;
  name: string;
  domain: string;
  url: (q: string) => string;
  refund: { window: string; mode: string; time: string; notes: string };
};

export const STORES: Store[] = [
  { id: "amazon", name: "Amazon", domain: "amazon.in", url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
    refund: { window: "7–30 days", mode: "Original payment / Amazon Pay balance", time: "2–5 business days after pickup", notes: "Electronics often replacement-only. Keep the box & invoice." } },
  { id: "flipkart", name: "Flipkart", domain: "flipkart.com", url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    refund: { window: "7–10 days", mode: "Original payment / Flipkart wallet", time: "Up to 7 business days", notes: "Some items 'No Returns' — check the badge before buying." } },
  { id: "myntra", name: "Myntra", domain: "myntra.com", url: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
    refund: { window: "14–30 days", mode: "Original payment / Myntra credit", time: "Instant credit, 5–7 days to bank", notes: "Tags must be intact. Innerwear not returnable." } },
  { id: "croma", name: "Croma", domain: "croma.com", url: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "7–10 business days", notes: "Only for manufacturing defects, after technician check." } },
  { id: "reliance", name: "Reliance Digital", domain: "reliancedigital.in", url: (q) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "7–14 business days", notes: "Demo/installation must be done before return request." } },
  { id: "tatacliq", name: "Tata CLiQ", domain: "tatacliq.com", url: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`,
    refund: { window: "10–30 days", mode: "Original payment / CLiQ Cash", time: "5–7 business days", notes: "Self-ship allowed for some pin codes." } },
  { id: "ajio", name: "AJIO", domain: "ajio.com", url: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`,
    refund: { window: "15–30 days", mode: "AJIO wallet / Original payment", time: "Wallet instant, bank 7 days", notes: "Choose bank refund explicitly, default is wallet." } },
  { id: "jiomart", name: "JioMart", domain: "jiomart.com", url: (q) => `https://www.jiomart.com/search/${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "5–7 business days", notes: "Groceries refund on delivery issues only." } },
];

export type Offer = {
  storeId: string;
  title: string | null;
  price: number | null;
  previous: number | null;
  mrp: number | null;
  inStock: boolean;
  url: string | null;
  image: string | null;
  fetchedAt: string;
};

export type Trend = "up" | "down" | "new" | "same";
export function trendOf(o: { price: number | null; previous: number | null }): Trend {
  if (o.previous === null || o.price === null) return "new";
  if (o.price > o.previous) return "up";
  if (o.price < o.previous) return "down";
  return "same";
}

export const normalizeQuery = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 160);
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const storeById = (id: string) => STORES.find((s) => s.id === id);

/** Offers at or below the alert target, in the user's selected stores and in stock. */
export function triggeredOffers<T extends { storeId: string; price: number | null; inStock: boolean }>(offers: T[], target: number, storeIds: string[]) {
  return offers.filter((o) => o.inStock && o.price !== null && storeIds.includes(o.storeId) && o.price <= target);
}

/** Strip store branding from search-result titles. */
export function cleanTitle(t: string) {
  return t
    .replace(/^(buy|shop)\s+/i, "")
    .replace(/\s*[:|–-]\s*(amazon\.in|flipkart(\.com)?|myntra|croma|ajio|jiomart|tata ?cliq|reliance digital).*$/i, "")
    .replace(/\s*(online at best price|at best price|online in india|price in india).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
