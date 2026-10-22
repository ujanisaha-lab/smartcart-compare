// Demo catalog. Live prices would come from store partner feeds; shape kept stable for that swap.
export type Store = {
  id: string;
  name: string;
  url: (q: string) => string;
  refund: { window: string; mode: string; time: string; notes: string };
};

export const STORES: Store[] = [
  { id: "amazon", name: "Amazon", url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
    refund: { window: "7–30 days", mode: "Original payment / Amazon Pay balance", time: "2–5 business days after pickup", notes: "Electronics often replacement-only. Keep the box & invoice." } },
  { id: "flipkart", name: "Flipkart", url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
    refund: { window: "7–10 days", mode: "Original payment / Flipkart wallet", time: "Up to 7 business days", notes: "Some items 'No Returns' — check the badge before buying." } },
  { id: "myntra", name: "Myntra", url: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
    refund: { window: "14–30 days", mode: "Original payment / Myntra credit", time: "Instant credit, 5–7 days to bank", notes: "Tags must be intact. Innerwear not returnable." } },
  { id: "croma", name: "Croma", url: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "7–10 business days", notes: "Only for manufacturing defects, after technician check." } },
  { id: "reliance", name: "Reliance Digital", url: (q) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "7–14 business days", notes: "Demo/installation must be done before return request." } },
  { id: "tatacliq", name: "Tata CLiQ", url: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(q)}`,
    refund: { window: "10–30 days", mode: "Original payment / CLiQ Cash", time: "5–7 business days", notes: "Self-ship allowed for some pin codes." } },
  { id: "ajio", name: "AJIO", url: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`,
    refund: { window: "15–30 days", mode: "AJIO wallet / Original payment", time: "Wallet instant, bank 7 days", notes: "Choose bank refund explicitly, default is wallet." } },
  { id: "jiomart", name: "JioMart", url: (q) => `https://www.jiomart.com/search/${encodeURIComponent(q)}`,
    refund: { window: "7 days", mode: "Original payment", time: "5–7 business days", notes: "Groceries refund on delivery issues only." } },
];

export type Offer = { storeId: string; price: number; previous: number | null; inStock: boolean };
export type Product = { id: string; name: string; category: string; emoji: string; offers: Offer[] };

const BASE: { id: string; name: string; category: string; emoji: string; mrp: number }[] = [
  { id: "iphone-16", name: "Apple iPhone 16 (128 GB)", category: "Mobiles", emoji: "📱", mrp: 79900 },
  { id: "galaxy-s25", name: "Samsung Galaxy S25 (256 GB)", category: "Mobiles", emoji: "📱", mrp: 80999 },
  { id: "oneplus-13", name: "OnePlus 13 (12/256)", category: "Mobiles", emoji: "📱", mrp: 69999 },
  { id: "macbook-air-m4", name: "MacBook Air M4 13\"", category: "Laptops", emoji: "💻", mrp: 99900 },
  { id: "sony-wh1000xm5", name: "Sony WH-1000XM5 Headphones", category: "Audio", emoji: "🎧", mrp: 34990 },
  { id: "airpods-pro-2", name: "AirPods Pro (2nd gen)", category: "Audio", emoji: "🎧", mrp: 24900 },
  { id: "boat-airdopes", name: "boAt Airdopes 141", category: "Audio", emoji: "🎧", mrp: 1499 },
  { id: "nike-pegasus", name: "Nike Pegasus 41 Running Shoes", category: "Fashion", emoji: "👟", mrp: 11895 },
  { id: "levis-511", name: "Levi's 511 Slim Jeans", category: "Fashion", emoji: "👖", mrp: 3599 },
  { id: "dyson-v12", name: "Dyson V12 Detect Slim", category: "Home", emoji: "🧹", mrp: 55900 },
  { id: "lg-tv-55", name: "LG 55\" 4K OLED TV", category: "TV", emoji: "📺", mrp: 139990 },
  { id: "kindle-pw", name: "Kindle Paperwhite 16GB", category: "Electronics", emoji: "📖", mrp: 16999 },
  { id: "ps5-slim", name: "PlayStation 5 Slim", category: "Gaming", emoji: "🎮", mrp: 54990 },
  { id: "philips-airfryer", name: "Philips Air Fryer HD9252", category: "Home", emoji: "🍟", mrp: 9995 },
];

// Deterministic pseudo-random so every user sees the same numbers.
function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export const PRODUCTS: Product[] = BASE.map((b) => ({
  id: b.id,
  name: b.name,
  category: b.category,
  emoji: b.emoji,
  offers: STORES.map((s) => {
    const r = rand(b.id + s.id);
    const price = Math.round((b.mrp * (0.78 + r * 0.2)) / 10) * 10 - 1;
    const trend = rand(s.id + b.id + "t");
    const previous = trend < 0.18 ? null : trend < 0.55 ? Math.round(price * (1.03 + r * 0.08)) : trend < 0.85 ? Math.round(price * (0.93 + r * 0.04)) : price;
    return { storeId: s.id, price, previous, inStock: rand(b.id + s.id + "s") > 0.12 };
  }),
}));

export type Trend = "up" | "down" | "new" | "same";
export function trendOf(o: Offer): Trend {
  if (o.previous === null) return "new";
  if (o.price > o.previous) return "up";
  if (o.price < o.previous) return "down";
  return "same";
}

export function searchProducts(q: string, limit = 20) {
  const s = q.trim().toLowerCase();
  if (!s) return PRODUCTS.slice(0, limit);
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)).slice(0, limit);
}

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const storeById = (id: string) => STORES.find((s) => s.id === id);
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

/** Cheapest in-stock offer among the selected stores. */
export function bestOffer(p: Product, storeIds: string[]) {
  return p.offers
    .filter((o) => o.inStock && storeIds.includes(o.storeId))
    .sort((a, b) => a.price - b.price)[0];
}

/** Alerts triggered: selected-store offers at or below the target. */
export function triggeredOffers(p: Product, target: number, storeIds: string[]) {
  return p.offers.filter((o) => o.inStock && storeIds.includes(o.storeId) && o.price <= target);
}
