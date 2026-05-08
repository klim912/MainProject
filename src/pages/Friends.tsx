// ЗМІНИ:
// - Виклик refreshForFriendsPage при монтуванні
// - Бейдж непрочитаних повідомлень (unreadCount)
import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../components/FriendsContext";
import ChatWindow from "../components/ChatWindow";
import {
  Search, UserPlus, Check, X, Clock, MessageCircle, User,
} from "react-feather";

function Friends() {
  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();
  const {
    friends, incomingRequests, outgoingRequests,
    searchUsers, sendFriendRequest, acceptRequest, declineRequest, removeFriend,
    refreshForFriendsPage,
  } = useFriends();

  const [tab, setTab] = useState<"friends" | "incoming" | "outgoing">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatFriend, setChatFriend] = useState<{ uid: string; name: string } | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (userSettings?.language) {
      i18n.changeLanguage(userSettings.language);
    }
  }, [userSettings, i18n]);

  // Викликаємо оновлення при заході на сторінку
  useEffect(() => {
    refreshForFriendsPage();
  }, []);

  // Відкрити чат при параметрі chat=...
  useEffect(() => {
    const chatUid = searchParams.get("chat");
    if (chatUid) {
      const friend = friends.find((f) => f.uid === chatUid);
      if (friend) setChatFriend({ uid: friend.uid, name: friend.displayName });
    }
  }, [searchParams, friends]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setSearchOpen(true);
  };

  return (
    <div className="mt-[200px] px-4 sm:px-6 lg:px-8 bg-black min-h-screen font-mono text-white">
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-lime-400 uppercase tracking-wider mb-6">{t("friends")}</h1>

        {/* Таби */}
        <div className="flex gap-4 mb-6">
          {(["friends", "incoming", "outgoing"] as const).map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`cursor-pointer px-4 py-2 rounded-sm border text-sm uppercase tracking-wide transition-all
                ${tab === tabName ? "bg-lime-500/20 border-lime-400 text-lime-300" : "border-lime-500/30 text-lime-400 hover:bg-lime-500/10"}`}
            >
              {tabName === "friends" ? t("friends") : tabName === "incoming" ? t("incoming_requests", "Incoming") : t("outgoing_requests", "Outgoing")}
            </button>
          ))}
        </div>

        {/* Пошук друзів */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={t("search_friends_placeholder", "Search by name or email...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-neutral-900/50 border border-lime-500/50 text-lime-400 px-4 py-2 rounded-sm focus:outline-none focus:border-lime-500 text-sm"
          />
          <button onClick={handleSearch} className="cursor-pointer bg-lime-500/10 border border-lime-500 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all">
            <Search size={18} />
          </button>
        </div>

        {/* Результати пошуку */}
        {searchOpen && searchResults.length > 0 && (
          <div className="bg-neutral-950 border border-lime-500/30 rounded-sm p-3 mb-4">
            {searchResults.map((user) => (
              <div key={user.uid} className="flex items-center justify-between py-2 border-b border-lime-500/20 last:border-none">
                <div className="flex items-center gap-3">
                  <img src={user.avatar || "../src/assets/avatar.png"} alt="" className="size-8 rounded-full border border-lime-500/30" />
                  <span className="text-lime-300 text-sm">{user.displayName} ({user.email})</span>
                </div>
                <button onClick={() => { sendFriendRequest(user.uid); setSearchOpen(false); }} className="text-lime-400 hover:text-lime-300 transition cursor-pointer">
                  <UserPlus size={18} />
                </button>
              </div>
            ))}
            <button onClick={() => setSearchOpen(false)} className="cursor-pointer text-xs text-gray-500 mt-2 hover:text-gray-400">{t("close", "Close")}</button>
          </div>
        )}

        {/* Список друзів */}
        {tab === "friends" && (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.uid} className="flex items-center justify-between bg-neutral-950/50 border border-lime-500/20 p-3 rounded-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={friend.avatar || "../src/assets/avatar.png"} alt="" className="size-10 rounded-full border border-lime-500/30" />
                    {friend.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-black"></span>}
                  </div>
                  <span className="text-lime-300 flex items-center gap-2">
                    {friend.displayName}
                    {friend.unreadCount ? (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{friend.unreadCount}</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/profile/${friend.uid}`} className="text-lime-400 hover:text-lime-300 cursor-pointer"><User size={18} /></Link>
                  <button onClick={() => setChatFriend({ uid: friend.uid, name: friend.displayName })} className="text-lime-400 hover:text-lime-300 cursor-pointer"><MessageCircle size={18} /></button>
                  <button onClick={() => removeFriend(friend.uid)} className="text-red-500 hover:text-red-400 cursor-pointer"><X size={18} /></button>
                </div>
              </div>
            ))}
            {friends.length === 0 && <p className="text-gray-500 text-sm">{t("no_friends", "No friends yet")}</p>}
          </div>
        )}

        {/* Вхідні запити */}
        {tab === "incoming" && (
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-neutral-950/50 border border-lime-500/20 p-3 rounded-sm">
                <div className="flex items-center gap-3">
                  <img src={req.fromAvatar || "../src/assets/avatar.png"} alt="" className="size-10 rounded-full border border-lime-500/30" />
                  <span className="text-lime-300">{req.fromName}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req.id)} className="text-green-400 hover:text-green-300 cursor-pointer"><Check size={18} /></button>
                  <button onClick={() => declineRequest(req.id)} className="text-red-500 hover:text-red-400 cursor-pointer"><X size={18} /></button>
                </div>
              </div>
            ))}
            {incomingRequests.length === 0 && <p className="text-gray-500 text-sm">{t("no_incoming", "No incoming requests")}</p>}
          </div>
        )}

        {/* Вихідні запити */}
        {tab === "outgoing" && (
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 bg-neutral-950/50 border border-lime-500/20 p-3 rounded-sm">
                <Clock size={16} className="text-yellow-400" />
                <span className="text-lime-300">{req.toName}</span>
                <span className="text-gray-500 text-xs ml-auto">{t("pending", "Pending")}</span>
              </div>
            ))}
            {outgoingRequests.length === 0 && <p className="text-gray-500 text-sm">{t("no_outgoing", "No outgoing requests")}</p>}
          </div>
        )}

        {/* Вікно чату */}
        {chatFriend && (
          <ChatWindow friendUid={chatFriend.uid} friendName={chatFriend.name} onClose={() => setChatFriend(null)} />
        )}
      </div>
    </div>
  );
}

export default Friends;