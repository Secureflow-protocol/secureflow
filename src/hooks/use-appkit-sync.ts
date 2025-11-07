// This hook is no longer needed for Stellar
// Stellar uses Freighter directly via @stellar/freighter-api
// Keeping this file for backward compatibility but it's not used

export function useAppKitSync() {
  // Stellar doesn't use AppKit, return empty object
  return { open: undefined, address: null, isConnected: false };
}
