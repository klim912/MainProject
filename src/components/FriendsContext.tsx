// ЗМІНИ:
// - Без автоматичного полінгу, додано refreshForFriendsPage
// - fetchFriends з підтримкою lastChecked для unreadCount
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface Friend {
  id: string;
  uid: string;
  displayName: string;
  avatar?: string;
  online?: boolean;
  since?: Date;
  unreadCount?: number;
}

interface FriendRequest {
  id: string;
  from?: string;
  fromName?: string;
  fromAvatar?: string;
  to?: string;
  toName?: string;
  toAvatar?: string;
  createdAt?: Date;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: Date;
}

interface FriendsContextType {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  loading: boolean;
  refreshForFriendsPage: () => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
  sendFriendRequest: (toUid: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<void>;
  fetchMessages: (friendUid: string) => Promise<Message[]>;
  sendMessage: (friendUid: string, text: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Онлайн статус
  useEffect(() => {
    if (!currentUser) return;
    const db = getFirestore();
    const userRef = doc(db, 'users', currentUser.uid);
    updateDoc(userRef, { online: true }).catch(() => {});
    const handleBeforeUnload = () => {
      fetch(`http://localhost:3000/friends/online/${currentUser.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online: false }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      updateDoc(userRef, { online: false }).catch(() => {});
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const fetchFriends = useCallback(async (lastChecked?: string | null) => {
    if (!currentUser) return;
    try {
      let url = `http://localhost:3000/friends/${currentUser.uid}`;
      if (lastChecked) {
        url += `?lastChecked=${encodeURIComponent(lastChecked)}`;
      }
      const res = await fetch(url);
      if (res.ok) setFriends(await res.json());
    } catch {}
  }, [currentUser]);

  const fetchIncoming = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:3000/friends/requests/incoming/${currentUser.uid}`);
      if (res.ok) setIncomingRequests(await res.json());
    } catch {}
  }, [currentUser]);

  const fetchOutgoing = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`http://localhost:3000/friends/requests/outgoing/${currentUser.uid}`);
      if (res.ok) setOutgoingRequests(await res.json());
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchFriends(null);  // без підрахунку unreadCount при першому завантаженні
      fetchIncoming();
      fetchOutgoing();
    }
  }, [currentUser, fetchFriends, fetchIncoming, fetchOutgoing]);

  // Функція, яка викликається при вході на сторінку друзів
  const refreshForFriendsPage = useCallback(async () => {
    if (!currentUser) return;
    const lastChecked = localStorage.getItem('lastCheckedMessages');
    await fetchFriends(lastChecked);  // оновлюємо друзів із unreadCount

    // Перевірка нових повідомлень один раз для toast
    try {
      const since = lastChecked || '1970-01-01';
      const res = await fetch(`http://localhost:3000/friends/messages/new/${currentUser.uid}?since=${encodeURIComponent(since)}`);
      if (res.ok) {
        const newMsgs = await res.json();
        if (Array.isArray(newMsgs) && newMsgs.length > 0) {
          const uniqueSenders = new Map<string, string>();
          newMsgs.forEach((msg: any) => {
            if (msg.from !== currentUser.uid) {
              uniqueSenders.set(msg.from, msg.fromName || 'Unknown');
            }
          });
          uniqueSenders.forEach((name) => {
            toast(`${t('new_message_from')} ${name}`);
          });
        }
      }
    } catch {}

    localStorage.setItem('lastCheckedMessages', new Date().toISOString());
  }, [currentUser, fetchFriends, toast, t]);

  const searchUsers = async (query: string) => {
    const res = await fetch(`http://localhost:3000/friends/search?q=${encodeURIComponent(query)}`);
    return res.json();
  };

  const sendFriendRequest = async (toUid: string) => {
    if (!currentUser) return;
    await fetch('http://localhost:3000/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUid: currentUser.uid, toUid }),
    });
    await fetchOutgoing();
  };

  const acceptRequest = async (requestId: string) => {
    if (!currentUser) return;
    await fetch('http://localhost:3000/friends/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, uid: currentUser.uid }),
    });
    await Promise.all([fetchIncoming(), fetchFriends(null)]);
  };

  const declineRequest = async (requestId: string) => {
    if (!currentUser) return;
    await fetch('http://localhost:3000/friends/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, uid: currentUser.uid }),
    });
    await fetchIncoming();
  };

  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    await fetch('http://localhost:3000/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.uid, friendUid }),
    });
    await fetchFriends(null);
  };

  const fetchMessages = async (friendUid: string): Promise<Message[]> => {
    if (!currentUser) return [];
    const res = await fetch(`http://localhost:3000/friends/messages/${currentUser.uid}/${friendUid}`);
    return res.ok ? res.json() : [];
  };

  const sendMessage = async (friendUid: string, text: string) => {
    if (!currentUser) return;
    await fetch('http://localhost:3000/friends/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: currentUser.uid, to: friendUid, text }),
    });
  };

  return (
    <FriendsContext.Provider value={{
      friends, incomingRequests, outgoingRequests, loading,
      refreshForFriendsPage,
      searchUsers, sendFriendRequest, acceptRequest, declineRequest, removeFriend,
      fetchMessages, sendMessage,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const context = useContext(FriendsContext);
  if (!context) throw new Error('useFriends must be used within FriendsProvider');
  return context;
}