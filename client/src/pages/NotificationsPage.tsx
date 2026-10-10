import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { getStoredNotifications } from '../services/shieldxlStore';
import { Bell, Check, Mail, Clock, Loader2 } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data?.notifications?.length > 0) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount || 0);
        setLoading(false);
        return;
      }
    } catch {
      // Local fallback
    }

    const localNotifs = getStoredNotifications();
    setNotifications(localNotifs);
    setUnreadCount(localNotifs.filter((n) => !n.readAt).length);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {}

    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Bell className="w-6 h-6 text-cyan-400" />
            ShieldXL Telemetry & Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status alerts, high-risk detection notifications, and engine status records.
          </p>
        </div>

        {unreadCount > 0 && (
          <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-bold px-3 py-1 rounded-full">
            {unreadCount} Unread Alerts
          </span>
        )}
      </div>

      <div className="bg-navy-900 border border-navy-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-navy-800">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No active alerts logged. You will be notified when analyses complete or require manual review.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !notif.readAt ? 'bg-cyan-950/20' : 'hover:bg-navy-800/30'
              }`}
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !notif.readAt ? 'bg-cyan-400' : 'bg-slate-600'
                    }`}
                  ></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {notif.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-slate-200">{notif.message}</p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    Channel: {notif.channel}
                  </span>
                  <span>Delivery: {notif.deliveryStatus}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {!notif.readAt && (
                  <button
                    onClick={() => markAsRead(notif._id)}
                    className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-950 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
