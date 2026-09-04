import type { BrokerAdapter } from "gloomberb/types/broker";
import type { BrokerInstanceConfig } from "gloomberb/types/config";
import type { GloomPlugin } from "gloomberb/types/plugin";
import { robinhoodAdapterCore, robinhoodPluginMeta, setStatus } from "./core";
import { loadRobinhoodNativeModule } from "./native-loader";
import type { BrokerPortfolioSnapshot } from "./normalize";

async function loadRobinhoodPortfolio(instance: BrokerInstanceConfig): Promise<BrokerPortfolioSnapshot> {
  setStatus(instance.id, "connecting", "Waiting for Robinhood");
  try {
    const module = await loadRobinhoodNativeModule();
    const snapshot = await module.loadRobinhoodPortfolio(instance);
    setStatus(instance.id, "connected", "Read-only OAuth connection");
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Robinhood sync failed.";
    setStatus(instance.id, "error", message);
    throw error;
  }
}

export const robinhoodBroker: BrokerAdapter = {
  ...robinhoodAdapterCore,

  async importPositions(instance) {
    return (await loadRobinhoodPortfolio(instance)).positions;
  },

  async importPortfolioSnapshot(instance) {
    return loadRobinhoodPortfolio(instance);
  },

  async listAccounts(instance) {
    return (await loadRobinhoodPortfolio(instance)).accounts;
  },

  async connect(instance) {
    await loadRobinhoodPortfolio(instance);
  },

  async disconnect(instance) {
    const module = await loadRobinhoodNativeModule();
    await module.robinhoodBroker.disconnect?.(instance);
    setStatus(instance.id, "disconnected");
  },

  async getPersistedConfigUpdate(instance) {
    const module = await loadRobinhoodNativeModule();
    return module.robinhoodBroker.getPersistedConfigUpdate?.(instance) ?? null;
  },
};

export const robinhoodPlugin: GloomPlugin = {
  ...robinhoodPluginMeta,
  broker: robinhoodBroker,
};

export default robinhoodPlugin;
