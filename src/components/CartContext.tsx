import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary, LibraryItem } from './LibraryContext';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

interface CartItem {
  title: string;
  thumb: string;
  salePrice: string;
  gameID: string;
  quantity: number;
}

interface CheckoutResult {
  success: boolean;
  error?: string;
  orderId?: string;
  newBalance?: number;
  libraryItems?: { title: string; dealID: string; purchaseDate: string; orderId: string; thumb?: string; activationKey?: string }[];
  receipt?: any;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (gameID: string) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  balance: number;
  setBalance: (amount: number) => void;
  checkout: () => Promise<CheckoutResult>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { library } = useLibrary();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [balance, setBalance] = useState<number>(() => {
    const savedBalance = localStorage.getItem("balance");
    return savedBalance ? parseFloat(savedBalance) : 100;
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("balance", balance.toString());
  }, [balance]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    if (library.some((libItem: LibraryItem) => libItem.dealID === item.gameID)) {
      toast(t('already_in_library'));
      return;
    }

    setCartItems((prevItems) => {
      if (!prevItems.find((i) => i.gameID === item.gameID)) {
        return [...prevItems, { ...item, quantity: 1 }];
      }
      return prevItems;
    });
  };

  const removeFromCart = (gameID: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.gameID !== gameID));
  };

  const checkout = async (): Promise<CheckoutResult> => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    if (cartItems.length === 0) return { success: false, error: 'Cart is empty' };

    try {
      const res = await fetch('http://localhost:3000/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          items: cartItems.map(item => ({
            title: item.title,
            dealID: item.gameID,
            salePrice: item.salePrice,
            thumb: item.thumb
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Payment failed' };
      }

      setCartItems([]);
      setBalance(data.newBalance);
      localStorage.removeItem("cart");

      return {
        success: true,
        orderId: data.orderId,
        newBalance: data.newBalance,
        libraryItems: data.libraryItems,
        receipt: data.receipt
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, setCartItems, balance, setBalance, checkout }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart використано за межами CartProvider");
  return context;
}