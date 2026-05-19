// ЗМІНИ:
// - Замінено текстовий індикатор завантаження на компонент Loader
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useFriends } from "../components/FriendsContext";
import ChatWindow from "../components/ChatWindow";
import Loader from "../components/Loader";
import { Monitor, Heart, ArrowLeft, MessageCircle } from "react-feather";

function FriendProfile() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();

  useEffect(() => {
    if (userSettings?.language) i18n.changeLanguage(userSettings.language);
  }, [userSettings, i18n]);

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      fetch(`http://localhost:3000/friends/profile/${uid}`).then(r => r.json()),
      fetch(`http://localhost:3000/user/library/${uid}`).then(r => r.json()),
      fetch(`http://localhost:3000/user/wishlist/${uid}`).then(r => r.json())
    ])
      .then(([profileData, libraryData, wishlistData]) => {
        setProfile(profileData);
        setLibrary(libraryData || []);
        setWishlist(wishlistData || []);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) {
    return (
      <div className="mt-[193px] flex justify-center items-center bg-black min-h-screen">
        <Loader text={t("loading")} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-[193px] text-center text-red-500 bg-black min-h-screen">
        {t("user_not_found")}
      </div>
    );
  }

  return (
    <div className="mt-[193px] px-4 bg-black min-h-screen text-white font-mono">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          to="/friends"
          className="inline-flex items-center gap-2 bg-neutral-900/50 border border-lime-500/30 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500/20 transition-all mb-6 cursor-pointer"
        >
          <ArrowLeft size={16} /> {t("back_to_friends")}
        </Link>

        <div className="bg-neutral-950 border border-lime-500/30 rounded-sm p-6 mb-8">
          <div className="flex items-center gap-6">
            <img
              src={profile.avatar || "../src/assets/avatar.png"}
              alt=""
              className="size-20 rounded-full border border-lime-500/50"
            />
            <div>
              <h1 className="text-2xl text-lime-400">{profile.displayName}</h1>
              <p className={`text-sm mt-1 ${profile.online ? "text-green-400" : "text-gray-500"}`}>
                {profile.online ? t("online") : t("offline")}
              </p>
              <button
                onClick={() => setChatOpen(true)}
                className="mt-3 flex items-center gap-2 bg-lime-500/10 border border-lime-500 text-lime-400 px-4 py-2 rounded-sm hover:bg-lime-500 hover:text-black transition-all cursor-pointer"
              >
                <MessageCircle size={16} />
                {t("send_message", "Send Message")}
              </button>
            </div>
          </div>
        </div>

        {/* Бібліотека */}
        <div className="mb-8">
          <h2 className="text-xl text-lime-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Monitor size={20} /> {t("library")}
          </h2>
          {library.length === 0 ? (
            <p className="text-gray-500">{t("no_games")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {library.map((game) => (
                <Link
                  key={game.dealID}
                  to={`/game/${game.dealID}`}
                  className="bg-neutral-950 border border-lime-500/30 rounded-md overflow-hidden transition-all duration-300 hover:border-lime-500/50 hover:scale-[1.03] group"
                >
                  <div className="h-32 bg-black flex items-center justify-center p-2">
                    <img
                      src={game.thumb || "https://via.placeholder.com/100?text=No+Image"}
                      alt={game.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:brightness-110"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs text-lime-300 truncate">{game.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Вішліст */}
        <div>
          <h2 className="text-xl text-lime-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Heart size={20} /> {t("wishlist")}
          </h2>
          {wishlist.length === 0 ? (
            <p className="text-gray-500">{t("no_games")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlist.map((game) => (
                <Link
                  key={game.dealID}
                  to={`/game/${game.dealID}`}
                  className="bg-neutral-950 border border-lime-500/30 rounded-md overflow-hidden transition-all duration-300 hover:border-lime-500/50 hover:scale-[1.03] group"
                >
                  <div className="h-32 bg-black flex items-center justify-center p-2">
                    <img
                      src={game.thumb || "https://via.placeholder.com/100?text=No+Image"}
                      alt={game.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:brightness-110"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs text-lime-300 truncate">{game.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {chatOpen && uid && profile && (
        <ChatWindow
          friendUid={uid}
          friendName={profile.displayName}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

export default FriendProfile;