// ЗМІНИ:
// - Збереження dealID замість gameID
// - addToLibrary приймає об'єкти з полем dealID
// - Синхронізація використовує dealID як ключ документа
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface LibraryItem {
  title: string;
  dealID: string;
  purchaseDate: string;
  orderId: string;
}

interface Receipt {
  orderId: string;
  games: { title: string; price: string; quantity: number }[];
  date: string;
  amount: string;
  paymentMethod: string;
}

interface LibraryContextType {
  library: LibraryItem[];
  addToLibrary: (items: { title: string; dealID: string }[], orderId: string) => void;
  receipts: Receipt[];
  addReceipt: (receipt: Receipt) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    const saved = localStorage.getItem("library");
    return saved ? JSON.parse(saved) : [];
  });
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const saved = localStorage.getItem("receipts");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!currentUser) return;
    fetch(`http://localhost:3000/user/library/${currentUser.uid}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLibrary(data);
      })
      .catch(console.error);
  }, [currentUser]);

  const syncLibrary = useCallback(async (items: LibraryItem[]) => {
    if (!currentUser) return;
    try {
      await fetch('http://localhost:3000/user/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid, items })
      });
    } catch (err) {
      console.error('Sync library failed:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(library));
    syncLibrary(library);
  }, [library, syncLibrary]);

  useEffect(() => {
    localStorage.setItem("receipts", JSON.stringify(receipts));
  }, [receipts]);

  const addToLibrary = (items: { title: string; dealID: string }[], orderId: string) => {
    const purchaseDate = new Date().toISOString();
    setLibrary(prev => [
      ...prev,
      ...items.map(item => ({ ...item, purchaseDate, orderId }))
    ]);
  };

  const addReceipt = (receipt: Receipt) => {
    setReceipts(prev => [...prev, receipt]);
  };

  return (
    <LibraryContext.Provider value={{ library, addToLibrary, receipts, addReceipt }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used within a LibraryProvider");
  return context;
}