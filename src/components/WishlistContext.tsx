import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLibrary, LibraryItem } from './LibraryContext';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

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
  const { library } = useLibrary();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [wishlist, setWishlist] = useState<Game[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`http://localhost:3000/user/wishlist/${currentUser.uid}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWishlist(data); })
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = async (game: Game) => {
    if (library.some((libItem: LibraryItem) => libItem.dealID === game.dealID)) {
      toast(t('already_in_library'));
      return;
    }
    setWishlist(prev => {
      if (prev.find(item => item.dealID === game.dealID)) return prev;
      return [...prev, game];
    });
    if (currentUser) {
      fetch('http://localhost:3000/user/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, game })
      }).catch(() => {});
    }
  };

  const removeFromWishlist = async (dealID: string) => {
    setWishlist(prev => prev.filter(item => item.dealID !== dealID));
    if (currentUser) {
      fetch('http://localhost:3000/user/wishlist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, dealID })
      }).catch(() => {});
    }
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