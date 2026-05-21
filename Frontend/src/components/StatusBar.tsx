import { Wifi, BatteryFull, Signal } from 'lucide-react';

// 62px high. Mirrors the iqsZI component in the .pen file.
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? 'text-fg-inverse' : 'text-fg-primary';
  return (
    <div className={`h-[62px] w-full flex items-end justify-between px-6 pb-2 ${color}`}>
      <div className="font-data text-[15px] font-semibold tracking-tight">9:41</div>
      <div className="flex items-center gap-1.5">
        <Signal className="w-4 h-4" strokeWidth={2.4} />
        <Wifi className="w-4 h-4" strokeWidth={2.4} />
        <BatteryFull className="w-5 h-5" strokeWidth={2.2} />
      </div>
    </div>
  );
}
