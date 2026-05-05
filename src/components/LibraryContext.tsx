import { createContext, useContext, useEffect, useState } from "react";

/**
 * Represents an item in the user's game library.
 */
interface LibraryItem {
  title: string;
  gameID: string;
  purchaseDate: string;
  orderId: string;
}

/**
 * Represents a receipt for a purchase.
 */
interface Receipt {
  orderId: string;
  games: { title: string; price: string; quantity: number }[];
  date: string;
  amount: string;
  paymentMethod: string;
}

/**
 * Type definition for the Library context.
 */
interface LibraryContextType {
  library: LibraryItem[];
  addToLibrary: (
    items: { title: string; gameID: string }[],
    orderId: string
  ) => void;
  receipts: Receipt[];
  addReceipt: (receipt: Receipt) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

/**
 * Provider component for the Library context. Manages the user's game library and receipts,
 * persisting data to localStorage.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render.
 * @returns {JSX.Element} The context provider wrapping the children.
 */
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    const saved = localStorage.getItem("library");
    return saved ? JSON.parse(saved) : [];
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const saved = localStorage.getItem("receipts");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem("receipts", JSON.stringify(receipts));
  }, [receipts]);

  /**
   * Adds items to the user's library with the current date and order ID.
   *
   * @param {Array<{ title: string; gameID: string }>} items - Array of game items to add.
   * @param {string} orderId - The order ID associated with the purchase.
   */
  const addToLibrary = (
    items: { title: string; gameID: string }[],
    orderId: string
  ) => {
    const purchaseDate = new Date().toISOString();
    setLibrary((prev) => [
      ...prev,
      ...items.map((item) => ({ ...item, purchaseDate, orderId })),
    ]);
  };

  /**
   * Adds a receipt to the receipts list.
   *
   * @param {Receipt} receipt - The receipt object to add.
   */
  const addReceipt = (receipt: Receipt) => {
    setReceipts((prev) => [...prev, receipt]);
  };

  return (
    <LibraryContext.Provider
      value={{ library, addToLibrary, receipts, addReceipt }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Custom hook to use the Library context. Must be used within a LibraryProvider.
 *
 * @returns {LibraryContextType} The library context value.
 * @throws {Error} If used outside of LibraryProvider.
 */
export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
