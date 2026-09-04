export type RobinhoodNativeModule = typeof import("./native");

/**
 * Deferred so the OAuth server, the MCP client, and their `node:*` imports are
 * only pulled in when a sync actually runs.
 */
export function loadRobinhoodNativeModule(): Promise<RobinhoodNativeModule> {
  return import("./native");
}
