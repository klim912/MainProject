// ЗМІНИ:
// - Об'єднання серверних та локальних даних
// - Виправлене видалення (dealID), синхронізація з сервером
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface Game {
  title: string;
  thumb: string;
  salePrice: string;
  dealID: string;
}

interface WishlistContextType {
  wishlist: Game[];
  addToWishlist: (game: Game) => void;
  removeFromWishlist: (dealID: string) => void;
  isGameWishlisted: (dealID: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [wishlist, setWishlist] = useState<Game[]>(() => {
    const saved = localStorage.getItem("wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!currentUser) return;
    fetch(`http://localhost:3000/user/wishlist/${currentUser.uid}`)
      .then(res => res.json())
      .then(serverList => {
        if (!Array.isArray(serverList)) return;
        setWishlist(prev => {
          const merged = [...prev];
          serverList.forEach((serverGame: Game) => {
            if (!merged.some(g => g.dealID === serverGame.dealID)) {
              merged.push(serverGame);
            }
          });
          return merged;
        });
      })
      .catch(console.error);
  }, [currentUser]);

  const syncWishlist = useCallback(async (items: Game[]) => {
    if (!currentUser) return;
    try {
      await fetch('http://localhost:3000/user/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, items })
      });
    } catch (err) {
      console.error('Sync wishlist failed:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
    syncWishlist(wishlist);
  }, [wishlist, syncWishlist]);

  const addToWishlist = (game: Game) => {
    setWishlist(prev => {
      if (prev.find(item => item.dealID === game.dealID)) return prev;
      return [...prev, game];
    });
  };

  const removeFromWishlist = (dealID: string) => {
    setWishlist(prev => prev.filter(item => item.dealID !== dealID));
  };

  const isGameWishlisted = (dealID: string) => {
    return wishlist.some(item => item.dealID === dealID);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isGameWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}