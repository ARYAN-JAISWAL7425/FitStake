// Tiny pub/sub for cross-hook refetch signals. Avoids pulling in React Query.

import { useEffect } from 'react';

type EventName = 'cycle-changed' | 'user-changed' | 'stake-changed';

const target = new EventTarget();

export function emit(name: EventName) {
  target.dispatchEvent(new Event(name));
}

export function useAppEvent(name: EventName, handler: () => void) {
  useEffect(() => {
    const cb = () => handler();
    target.addEventListener(name, cb);
    return () => target.removeEventListener(name, cb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
}
