import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScenario } from '@/context/ScenarioContext';
import { useAuth } from '@/context/AuthContext';
import { MdNotifications, MdChevronLeft, MdChevronRight, MdLogout } from 'react-icons/md';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { currentDay, advanceDay, goToDay, unreadCount, notifications, markNotificationRead, markAllRead } = useScenario();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
      {/* Page Title */}
      <h1 className="text-xl font-bold text-gray-900 hidden sm:block">{title}</h1>

      {/* Center: Scenario Day — bigger touch targets */}
      <div className="flex items-center gap-1 bg-primary/5 rounded-2xl px-2 py-1">
        <button
          onClick={() => goToDay(currentDay - 1)}
          disabled={currentDay <= 1}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
          aria-label="이전 날"
        >
          <MdChevronLeft className="text-2xl text-primary" />
        </button>
        <span className="text-sm sm:text-base font-bold text-primary min-w-[80px] sm:min-w-[100px] text-center">
          Day {currentDay} / 30
        </span>
        <button
          onClick={advanceDay}
          disabled={currentDay >= 30}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
          aria-label="다음 날"
        >
          <MdChevronRight className="text-2xl text-primary" />
        </button>
      </div>

      {/* Right: User + Notifications */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">{user.name}님</span>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors"
              aria-label="로그아웃"
            >
              <MdLogout className="text-xl text-gray-500" />
            </button>
          </div>
        )}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative w-11 h-11 rounded-xl flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors"
          aria-label={`알림 ${unreadCount}건`}
        >
          <MdNotifications className="text-[28px] text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs min-w-[22px] h-[22px] rounded-full flex items-center justify-center font-bold px-1">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-14 w-[92vw] sm:w-[380px] max-w-[380px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-lg text-gray-900">알림</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-sm text-primary font-medium hover:underline cursor-pointer px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-gray-400">알림이 없습니다</p>
              ) : (
                notifications.slice().reverse().map(n => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !n.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                        n.type === 'danger' ? 'bg-danger' :
                        n.type === 'warning' ? 'bg-warning' :
                        n.type === 'success' ? 'bg-success' : 'bg-info'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate">{n.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(n.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
