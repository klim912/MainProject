// ЗМІНИ:
// - Додано ToastProvider в ієрархію провайдерів (рядок ~9)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "../components/CartContext";
import { WishlistProvider } from "../components/WishlistContext";
import { LibraryProvider } from "../components/LibraryContext";
import { AuthProvider } from "./AuthContext";
import { ToastProvider } from "../components/ToastContext";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

const AppProviders = ({ children } : {children: ReactNode}) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <WishlistProvider>
            <LibraryProvider>{children}</LibraryProvider>
          </WishlistProvider>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AppProviders;