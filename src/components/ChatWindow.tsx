// ЗМІНИ:
// - Компонент чату з автозакриттям по overlay, інтервал 5с
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFriends } from "./FriendsContext";
import { MessageCircle, X } from "react-feather";

export default function ChatWindow({ friendUid, friendName, onClose }: { friendUid: string; friendName: string; onClose: () => void }) {
  const { fetchMessages, sendMessage } = useFriends();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const load = () => fetchMessages(friendUid).then(setMessages).catch(console.error);
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [friendUid, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(friendUid, text);
    setText("");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-20 right-4 w-96 bg-neutral-950 border border-lime-500/30 rounded-t-lg shadow-lg z-50">
        <div className="flex justify-between items-center p-3 border-b border-lime-500/30">
          <span className="text-lime-400 font-mono text-sm">{friendName}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>
        <div className="h-80 overflow-y-auto p-3 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`text-sm ${msg.from === friendUid ? 'text-left' : 'text-right'}`}>
              <span className={`inline-block px-2 py-1 rounded ${msg.from === friendUid ? 'bg-lime-500/20 text-lime-300' : 'bg-blue-500/20 text-blue-300'}`}>{msg.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex p-2 border-t border-lime-500/30">
          <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-neutral-900 text-lime-400 text-sm px-2 py-1 rounded-sm focus:outline-none" placeholder={t("message_placeholder", "Message...")} />
          <button onClick={handleSend} className="ml-2 text-lime-400 hover:text-lime-300 cursor-pointer"><MessageCircle size={16} /></button>
        </div>
      </div>
    </>
  );
}