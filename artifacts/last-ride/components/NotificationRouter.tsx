import * as Notifications from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useLastRide } from '@/context/LastRideContext';
import type { NotificationTarget } from '@/lib/notifications';

const TARGETS: NotificationTarget[] = ['/ride', '/alternatives'];

/**
 * Opens the screen a tapped notification points to (e.g. the "missed the last
 * train?" check-in opens the options). Handles taps that launch the app as well
 * as taps while it is in the background. Native only.
 */
export function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  const { isHydrated, homeStation } = useLastRide();
  const pathname = usePathname();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !isHydrated || !homeStation) return;
    // Wait until the welcome screen has sent the user on, or it would replace this navigation.
    if (pathname === '/' || pathname === '/home-station') return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    void Notifications.clearLastNotificationResponseAsync();
    const target = response.notification.request.content.data?.target;
    if (TARGETS.includes(target as NotificationTarget) && target !== pathname) router.replace(target as NotificationTarget);
  }, [response, isHydrated, homeStation, pathname]);

  return null;
}
