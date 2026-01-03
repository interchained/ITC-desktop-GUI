import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Wallet } from "./wallet/wallet";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Wallet />
    </QueryClientProvider>
  );
}
