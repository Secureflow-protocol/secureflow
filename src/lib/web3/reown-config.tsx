// This file is no longer needed for Stellar
// Stellar uses Freighter directly via @stellar/freighter-api
// Keeping this file for backward compatibility but it's not used

import React from "react";

export function AppKit({ children }: { children: React.ReactNode }) {
  // Stellar doesn't use AppKit, just return children
  return <>{children}</>;
}
