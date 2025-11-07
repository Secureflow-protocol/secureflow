import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "@stellar/design-system/build/styles.min.css";
import { WalletProvider } from "./providers/WalletProvider.tsx";
import { Web3Provider } from "./contexts/web3-context";
import { DelegationProvider } from "./contexts/delegation-context";
import { NotificationProvider as StellarNotificationProvider } from "./providers/NotificationProvider.tsx";
import { NotificationProvider as SecureFlowNotificationProvider } from "./contexts/notification-context";
import { ThemeProvider } from "./components/theme-provider";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <StellarNotificationProvider>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <Web3Provider>
              <DelegationProvider>
                <SecureFlowNotificationProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </SecureFlowNotificationProvider>
              </DelegationProvider>
            </Web3Provider>
          </WalletProvider>
        </QueryClientProvider>
      </StellarNotificationProvider>
    </ThemeProvider>
  </StrictMode>
);
