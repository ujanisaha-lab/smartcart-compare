import { describe, expect, it } from "vitest";
import { cleanTitle, trendOf, triggeredOffers } from "@/lib/catalog";

describe("price tags", () => {
  it("red/up when price rose", () => expect(trendOf({ price: 110, previous: 100 })).toBe("up"));
  it("green/down when price fell", () => expect(trendOf({ price: 90, previous: 100 })).toBe("down"));
  it("grey/new when no history", () => expect(trendOf({ price: 90, previous: null })).toBe("new"));
});

describe("alerts", () => {
  const offers = [
    { storeId: "amazon", price: 900, inStock: true },
    { storeId: "flipkart", price: 800, inStock: false },
    { storeId: "croma", price: 1200, inStock: true },
  ];
  it("triggers only for selected, in-stock stores at or below target", () => {
    expect(triggeredOffers(offers, 1000, ["amazon", "flipkart", "croma"]).map((o) => o.storeId)).toEqual(["amazon"]);
    expect(triggeredOffers(offers, 1000, ["croma"])).toHaveLength(0);
  });
});

describe("titles", () => {
  it("strips store branding", () =>
    expect(cleanTitle("Apple iPhone 16 (128 GB Storage) Online at Best Price On Flipkart.com")).toBe("Apple iPhone 16 (128 GB Storage)"));
});
