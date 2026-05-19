import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

export interface LibraryItem {
  title: string;
  dealID: string;
  purchaseDate: string;
  orderId: string;
  thumb?: string;
  activationKey?: string;
}

export interface Receipt {  }

interface LibraryContextType {
  library: LibraryItem[];
  addToLibrary: (items: { title: string; dealID: string; thumb?: string; activationKey?: string }[], orderId: string) => void;
  receipts: Receipt[];
  addReceipt: (receipt: Receipt) => void;
  getReceiptByOrderId: (orderId: string) => Receipt | undefined;
  clearLibrary: () => void;
  resetBalance: () => void;
  refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);


function decodeDealID(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const loadFromServer = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:3000/user/library/${currentUser.uid}`);
      if (res.ok) {
        const serverLibrary: LibraryItem[] = await res.json();
        if (Array.isArray(serverLibrary)) {
          const decodedLibrary = serverLibrary.map(item => ({
            ...item,
            dealID: decodeDealID(item.dealID),
          }));
          setLibrary(decodedLibrary);
          localStorage.setItem("library", JSON.stringify(decodedLibrary));
        }
      }
    } catch (err) {
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLibrary([]);
      setReceipts([]);
      return;
    }
    loadFromServer();
    const savedReceipts = localStorage.getItem("receipts");
    if (savedReceipts) {
      try { setReceipts(JSON.parse(savedReceipts)); } catch {}
    }
  }, [currentUser, loadFromServer]);

  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem("receipts", JSON.stringify(receipts));
  }, [receipts]);

  const addToLibrary = (
    items: { title: string; dealID: string; thumb?: string; activationKey?: string }[],
    orderId: string
  ) => {
    setLibrary(prev => {
      const newItems = new Map<string, LibraryItem>();
      prev.forEach(item => newItems.set(item.dealID, item));
      const purchaseDate = new Date().toISOString();
      items.forEach(item => {
        const decodedID = decodeDealID(item.dealID);
        if (!newItems.has(decodedID)) {
          newItems.set(decodedID, {
            title: item.title,
            dealID: decodedID,
            purchaseDate,
            orderId,
            thumb: item.thumb,
            activationKey: item.activationKey,
          });
        }
      });
      return Array.from(newItems.values());
    });
  };

  const addReceipt = (receipt: Receipt) => setReceipts(prev => [...prev, receipt]);
  const getReceiptByOrderId = (orderId: string) => receipts.find(r => r.orderId === orderId);

  const clearLibrary = () => {
    setLibrary([]);
    setReceipts([]);
    localStorage.removeItem('library');
    localStorage.removeItem('receipts');
    if (currentUser) {
      fetch(`http://localhost:3000/user/library/${currentUser.uid}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const resetBalance = () => {
    localStorage.setItem('balance', '100');
    if (currentUser) {
      const db = getFirestore();
      updateDoc(doc(db, 'users', currentUser.uid), { balance: 100 }).catch(() => {});
    }
    window.location.reload();
  };

  const refreshLibrary = async () => {
    await loadFromServer();
  };

  return (
    <LibraryContext.Provider value={{
      library,
      addToLibrary,
      receipts,
      addReceipt,
      getReceiptByOrderId,
      clearLibrary,
      resetBalance,
      refreshLibrary,
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextType {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used within a LibraryProvider");
  return context;
}