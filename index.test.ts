import { describe, expect, test } from "bun:test";
import browserPlugin from "./index.browser";
import nativePlugin from "./index";
import { requireRobinhoodPositionTools } from "./native";
import { normalizeRobinhoodSnapshot } from "./normalize";

describe("Robinhood tool selection", () => {
  test("accepts only the two read-only position tools", () => {
    const selected = requireRobinhoodPositionTools([
      { name: "get_accounts", annotations: { readOnlyHint: true } },
      { name: "get_equity_positions", annotations: { readOnlyHint: true } },
      { name: "place_equity_order", annotations: { readOnlyHint: false } },
    ]);

    expect([...selected.keys()]).toEqual(["get_accounts", "get_equity_positions"]);
  });

  test("refuses a position tool the server no longer marks read-only", () => {
    // The whole safety story is that this plugin cannot trade. If Robinhood
    // ever drops the read-only hint, the sync has to stop rather than call it.
    expect(() => requireRobinhoodPositionTools([
      { name: "get_accounts", annotations: { readOnlyHint: true } },
      { name: "get_equity_positions", annotations: { readOnlyHint: false } },
    ])).toThrow("read-only get_equity_positions");
  });
});

describe("Robinhood normalization", () => {
  test("normalizes nested accounts and positions without duplicate records", () => {
    const snapshot = normalizeRobinhoodSnapshot(
      { accounts: [{ account_number: "RH-1", account_type: "ROTH_IRA", currency: "USD" }] },
      [{ result: { positions: [{
        accountNumber: "RH-1",
        instrument: { symbol: "hood", name: "Robinhood Markets" },
        quantity: "2.5",
        total_cost: "100",
        market_value: "125",
      }] } }],
    );

    expect(snapshot.accounts).toEqual([expect.objectContaining({ accountId: "RH-1", name: "Roth Ira" })]);
    expect(snapshot.positions).toEqual([expect.objectContaining({
      accountId: "RH-1",
      ticker: "HOOD",
      shares: 2.5,
      avgCost: 40,
      markPrice: 50,
      marketValue: 125,
    })]);
  });

  test("stores shorts as absolute shares and weighted-averages merged short lots", () => {
    const snapshot = normalizeRobinhoodSnapshot(
      { accounts: [{ account_number: "RH-1", account_type: "INDIVIDUAL" }] },
      [{ result: { positions: [
        { accountNumber: "RH-1", instrument: { symbol: "TSLA" }, quantity: "-10", average_cost: "100", market_value: "-800" },
        { accountNumber: "RH-1", instrument: { symbol: "TSLA" }, quantity: "-5", average_cost: "110", market_value: "-400" },
      ] } }],
    );

    expect(snapshot.positions).toEqual([expect.objectContaining({
      ticker: "TSLA",
      shares: 15,
      avgCost: 1550 / 15,
      side: "short",
    })]);
  });

  test("aggregates identical same-account lots instead of keeping only the last row", () => {
    const snapshot = normalizeRobinhoodSnapshot(
      { accounts: [{ account_number: "RH-1", currency: "USD" }] },
      { positions: [
        { accountNumber: "RH-1", instrument: { symbol: "HOOD" }, quantity: "2", total_cost: "80", market_value: "100" },
        { accountNumber: "RH-1", instrument: { symbol: "HOOD" }, quantity: "3", total_cost: "150", market_value: "150" },
      ] },
    );

    expect(snapshot.positions).toEqual([expect.objectContaining({
      ticker: "HOOD",
      shares: 5,
      avgCost: 46,
      marketValue: 250,
    })]);
  });
});

describe("browser entry", () => {
  test("presents the same identity and fields as the native entry", () => {
    // The desktop view loads the browser entry while the Bun process loads the
    // native one. If these drift, a profile saved in the view writes config the
    // backend adapter does not understand.
    expect(browserPlugin.id).toBe(nativePlugin.id);
    expect(browserPlugin.broker?.id).toBe(nativePlugin.broker?.id);
    expect(browserPlugin.broker?.configSchema).toEqual(nativePlugin.broker!.configSchema);
  });

  test("refuses to sync in the renderer rather than failing obscurely", () => {
    expect(() => browserPlugin.broker!.importPositions({
      id: "rh", brokerType: "robinhood", label: "Robinhood", enabled: true, config: {},
    })).toThrow("runs in the Gloomberb backend");
  });
});
