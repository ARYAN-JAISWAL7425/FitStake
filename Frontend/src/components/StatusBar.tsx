import { useEffect, useState } from 'react';

function nowLabel() {
  // Real device time, e.g. "9:41 AM" — formatted for the user's locale.
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// 62px high. Mirrors the iqsZI component in the .pen file, but shows the real
// device clock instead of a fake "9:41". We don't render signal/wifi/battery
// icons — the user's actual device already shows those, and a browser can't read
// them reliably (no cellular-signal API; the battery API is deprecated).
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? 'text-fg-inverse' : 'text-fg-primary';
  const [time, setTime] = useState(nowLabel);

  useEffect(() => {
    const id = setInterval(() => setTime(nowLabel()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`h-[62px] w-full flex items-end px-6 pb-2 ${color}`}>
      <div className="font-data text-[15px] font-semibold tracking-tight">{time}</div>
    </div>
  );
}
