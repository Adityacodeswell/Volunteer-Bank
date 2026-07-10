import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { Notification } from "../types";
import { 
  Bell, 
  MessageSquare, 
  CheckSquare, 
  UserPlus, 
  CheckCircle, 
  Check, 
  Info, 
  AlertCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const NotificationBell: React.FC<{ userId?: string; onNavigate?: (link: string) => void }> = ({ userId, onNavigate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUserId = userId || user?.id;

  const fetchNotifications = async () => {
    if (!activeUserId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    if (!activeUserId) return;

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`user-notifications-${activeUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${activeUserId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      channel.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeUserId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllAsRead = async () => {
    if (!activeUserId) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", activeUserId)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notif.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
    }
    setIsOpen(false);
    
    if (notif.link) {
      if (onNavigate) {
        onNavigate(notif.link);
      } else {
        navigate(notif.link);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "join_request":
        return <UserPlus className="w-4 h-4 text-cyan" />;
      case "request_accepted":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "request_declined":
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "new_message":
        return <MessageSquare className="w-4 h-4 text-navy" />;
      case "task_assigned":
      case "task_updated":
        return <CheckSquare className="w-4 h-4 text-sky-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-none"
        id="notification-bell-btn"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all max-h-[380px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <span className="font-serif font-bold text-sm text-[#1B4965]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-[#0096C7] hover:text-[#023E8A] transition cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 text-xs">
                <Check className="w-8 h-8 text-emerald-500 mb-2 border border-emerald-100 bg-emerald-50 rounded-full p-1" />
                <span className="font-medium text-slate-600">You're all caught up.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 flex gap-3 cursor-pointer transition hover:bg-slate-50/50 ${
                    !notif.read ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 border border-slate-100 h-9 w-9 flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs text-slate-800 truncate leading-snug ${!notif.read ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">{notif.body}</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                      {getRelativeTime(notif.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
