import type { BrokerAdapter } from "gloomberb/types/broker";
import type { GloomPlugin } from "gloomberb/types/plugin";
import { robinhoodAdapterCore, robinhoodPluginMeta } from "./core";

/**
 * The renderer's copy of the plugin.
 *
 * Robinhood's OAuth flow runs an HTTP server on localhost and speaks MCP over
 * the network, none of which exists in a browser context, so the desktop view
 * gets identity, fields, and status only. Gloomberb wraps this adapter in a
 * remote one that forwards every operation to the Bun process, so these bodies
 * are a guard rail rather than a code path anyone reaches.
 */
function backendOnly(): never {
  throw new Error("Robinhood sync runs in the Gloomberb backend.");
}

export const robinhoodBroker: BrokerAdapter = {
  ...robinhoodAdapterCore,
  importPositions: backendOnly,
  importPortfolioSnapshot: backendOnly,
  listAccounts: backendOnly,
  connect: backendOnly,
  disconnect: backendOnly,
  getPersistedConfigUpdate: backendOnly,
};

export const robinhoodPlugin: GloomPlugin = {
  ...robinhoodPluginMeta,
  broker: robinhoodBroker,
};

export default robinhoodPlugin;
