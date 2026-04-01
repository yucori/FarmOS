import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { FarmerProfile, ScenarioEvent, AppNotification } from '@/types';
import { FARMER_PROFILE } from '@/mocks/farmer';
import { SCENARIO_EVENTS, SCENARIO_NOTIFICATIONS } from '@/mocks/scenario';

interface ScenarioContextType {
  farmer: FarmerProfile;
  currentDay: number;
  events: ScenarioEvent[];
  notifications: AppNotification[];
  unreadCount: number;
  advanceDay: () => void;
  goToDay: (day: number) => void;
  resetScenario: () => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  currentDayEvents: ScenarioEvent[];
}

const ScenarioContext = createContext<ScenarioContextType | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [currentDay, setCurrentDay] = useState(1);
  const [notifications, setNotifications] = useState<AppNotification[]>(SCENARIO_NOTIFICATIONS);

  const visibleNotifications = notifications.filter(n => {
    const nDay = new Date(n.timestamp).getDate();
    return nDay <= currentDay;
  });

  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const currentDayEvents = SCENARIO_EVENTS.filter(e => e.day === currentDay);

  const advanceDay = useCallback(() => {
    setCurrentDay(prev => Math.min(30, prev + 1));
  }, []);

  const goToDay = useCallback((day: number) => {
    setCurrentDay(Math.max(1, Math.min(30, day)));
  }, []);

  const resetScenario = useCallback(() => {
    setCurrentDay(1);
    setNotifications(SCENARIO_NOTIFICATIONS);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return (
    <ScenarioContext.Provider
      value={{
        farmer: FARMER_PROFILE,
        currentDay,
        events: SCENARIO_EVENTS,
        notifications: visibleNotifications,
        unreadCount,
        advanceDay,
        goToDay,
        resetScenario,
        markNotificationRead,
        markAllRead,
        currentDayEvents,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error('useScenario must be used within ScenarioProvider');
  return ctx;
}
