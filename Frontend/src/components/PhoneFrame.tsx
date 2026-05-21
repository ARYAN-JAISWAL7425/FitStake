import { ReactNode } from 'react';

// Wraps a screen in a 390x844 phone-shaped frame on desktop.
// On narrow viewports, it fills the screen instead.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-neutral-200 grid place-items-center p-0 sm:p-6">
      <div
        className="relative w-full sm:w-[390px] h-[100dvh] sm:h-[844px] sm:rounded-[28px] overflow-hidden sm:shadow-2xl sm:ring-1 sm:ring-black/5 bg-surface-primary"
        style={{ maxWidth: '100vw' }}
      >
        {children}
      </div>
    </div>
  );
}
