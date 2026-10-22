import { describe, expect, it } from "vitest";
import { trendOf, triggeredOffers, PRODUCTS } from "@/lib/catalog";

describe("price tags", () => {
  it("red/up when price rose", () => expect(trendOf({ storeId: "a", price: 110, previous: 100, inStock: true })).toBe("up"));
  it("green/down when price fell", () => expect(trendOf({ storeId: "a", price: 90, previous: 100, inStock: true })).toBe("down"));
  it("grey/new when no history", () => expect(trendOf({ storeId: "a", price: 90, previous: null, inStock: true })).toBe("new"));
});

describe("alerts", () => {
  it("only triggers for selected, in-stock stores at or below target", () => {
    const p = PRODUCTS[0];
    const hits = triggeredOffers(p, 10_000_000, ["amazon"]);
    expect(hits.every((o) => o.storeId === "amazon" && o.inStock)).toBe(true);
    expect(triggeredOffers(p, 1, ["amazon"])).toHaveLength(0);
  });
});
