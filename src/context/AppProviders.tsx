import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "../components/CartContext";
import { WishlistProvider } from "../components/WishlistContext";
import { LibraryProvider } from "../components/LibraryContext";
import { AuthProvider } from "./AuthContext";
import { ToastProvider } from "../components/ToastContext";
import { FriendsProvider } from "../components/FriendsContext";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ToastProvider>
        <LibraryProvider>
          <CartProvider>
            <WishlistProvider>
              <FriendsProvider>{children}</FriendsProvider>
            </WishlistProvider>
          </CartProvider>
        </LibraryProvider>
      </ToastProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AppProviders;