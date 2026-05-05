import { createContext, useContext, useEffect, useState } from "react";

/**
 * Represents a game in the wishlist.
 */
interface Game {
  title: string;
  thumb: string;
  salePrice: string;
  gameID: string;
}

/**
 * Type definition for the Wishlist context.
 */
interface WishlistContextType {
  wishlist: Game[];
  addToWishlist: (game: Game) => void;
  removeFromWishlist: (title: string) => void;
  isGameWishlisted: (title: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

/**
 * Provider component for the Wishlist context. Manages the user's wishlist,
 * persisting data to localStorage.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to render.
 * @returns {JSX.Element} The context provider wrapping the children.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Game[]>(() => {
    const savedWishlist = localStorage.getItem("wishlist");
    return savedWishlist ? JSON.parse(savedWishlist) : [];
  });

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  /**
   * Adds a game to the wishlist if it's not already present.
   *
   * @param {Game} game - The game object to add.
   */
  const addToWishlist = (game: Game) => {
    setWishlist((prevItems) => {
      if (!prevItems.find((item) => item.title === game.title)) {
        return [...prevItems, game];
      }
      return prevItems;
    });
  };

  /**
   * Removes a game from the wishlist by title.
   *
   * @param {string} title - The title of the game to remove.
   */
  const removeFromWishlist = (title: string) => {
    setWishlist((prevItems) =>
      prevItems.filter((item) => item.title !== title)
    );
  };

  /**
   * Checks if a game is in the wishlist by title.
   *
   * @param {string} title - The title of the game to check.
   * @returns {boolean} True if the game is wishlisted, false otherwise.
   */
  const isGameWishlisted = (title: string) => {
    return wishlist.some((item) => item.title === title);
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isGameWishlisted }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Custom hook to use the Wishlist context. Must be used within a WishlistProvider.
 *
 * @returns {WishlistContextType} The wishlist context value.
 * @throws {Error} If used outside of WishlistProvider.
 */
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
