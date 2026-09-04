import type { BrokerAdapter, BrokerConnectionStatus } from "gloomberb/types/broker";
import type { BrokerInstanceConfig } from "gloomberb/types/config";

/**
 * Everything both entries share.
 *
 * The plugin is loaded twice on the desktop: natively in the Bun process, which
 * does the OAuth dance and the sync, and as a browser bundle in the view, which
 * only renders the profile form and the connection status. Keeping the identity
 * and the pure config conversions here means the two copies cannot disagree
 * about the broker's id, its fields, or how a saved profile round-trips.
 */

const statuses = new Map<string, BrokerConnectionStatus>();
const statusListeners = new Map<string, Set<() => void>>();

export function setStatus(instanceId: string, state: BrokerConnectionStatus["state"], message?: string): void {
  statuses.set(instanceId, { state, message, mode: "oauth", updatedAt: Date.now() });
  for (const listener of statusListeners.get(instanceId) ?? []) listener();
}

export const robinhoodConfigSchema: BrokerAdapter["configSchema"] = [{
  key: "connectionMode",
  label: "Connection",
  type: "select",
  required: true,
  defaultValue: "oauth",
  options: [{
    label: "Robinhood sign-in (read-only sync)",
    value: "oauth",
    description: "Gloomberb opens Robinhood in your browser.",
  }],
}];

/** Adapter members that need no network access, so both entries can serve them. */
export const robinhoodAdapterCore = {
  id: "robinhood",
  name: "Robinhood",
  configSchema: robinhoodConfigSchema,

  async validate(instance: BrokerInstanceConfig) {
    return instance.config.connectionMode === "oauth";
  },

  getStatus(instance: BrokerInstanceConfig): BrokerConnectionStatus {
    return statuses.get(instance.id) ?? {
      state: instance.config.oauth ? "connected" : "disconnected",
      message: instance.config.oauth ? "Read-only OAuth connection" : "Sign in during the first sync",
      mode: "oauth",
      updatedAt: 0,
    };
  },

  subscribeStatus(instance: BrokerInstanceConfig, listener: () => void) {
    const listeners = statusListeners.get(instance.id) ?? new Set<() => void>();
    listeners.add(listener);
    statusListeners.set(instance.id, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) statusListeners.delete(instance.id);
    };
  },

  toConfigValues() {
    return { connectionMode: "oauth" };
  },

  fromConfigValues(_values: Record<string, unknown>, previous?: BrokerInstanceConfig | null) {
    return {
      connectionMode: "oauth",
      ...(previous?.config.oauth ? { oauth: previous.config.oauth } : {}),
    };
  },
} satisfies Partial<BrokerAdapter> & { id: string; name: string };

export const robinhoodPluginMeta = {
  id: "robinhood",
  name: "Robinhood",
  version: "1.0.0",
  description: "Read-only account and position sync through Robinhood Trading MCP.",
  homepage: "https://github.com/gloom-sh/gloomberb-robinhood",
  toggleable: true,
} as const;
