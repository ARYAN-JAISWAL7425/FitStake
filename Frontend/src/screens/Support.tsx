import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy, Mail, MessageCircle, ChevronDown, Send, CircleCheck, TriangleAlert } from 'lucide-react';
import { StatusBar } from '../components/StatusBar';
import { routes } from '../lib/routes';
import { useUser } from '../hooks/useUser';
import { api, ApiError } from '../lib/api';
import { isAuthenticated } from '../lib/auth';

const FAQ = [
  {
    q: 'How does the stake actually work?',
    a: 'You lock ₹100–10,000 at cycle start. Complete 25 of 30 days → full stake returns to your wallet. Miss → stake goes to your selected charity in your name. FitStake takes nothing either way on B2C.',
  },
  {
    q: 'What counts as a "completed" day?',
    a: 'Every goal for that day must be verified — not just tapped. Steps verify automatically via Google Fit; water, diet and sleep verify by photo (object detection); strength and cardio verify by photo (pose detection). A day is credited only when ALL its goals are verified.',
  },
  {
    q: 'How is "Daily steps" verified?',
    a: 'Connect Google Fit once (Profile → Connect Google Fit). When you tap the steps goal, we pull your real step count for today straight from Google\'s servers and compare it to your target. Carry your phone while walking so the steps register. No connection = the goal can\'t be completed. There\'s a 50,000-steps/day cap so a single huge dump can\'t be gamed.',
  },
  {
    q: 'How is "Drink water" verified?',
    a: 'Tap the goal → take/upload a photo that clearly shows a glass, cup or water bottle. On-device AI (runs in your browser, nothing is sent anywhere) checks the photo actually contains a drinking vessel before it counts. A meme or random screenshot is rejected.',
  },
  {
    q: 'How is "Diet / healthy meal" verified?',
    a: 'Photo of your meal. The on-device detector looks for food items — a plate, bowl, fruit (apple, banana, orange), vegetables, or cutlery on a dining table. If no food is recognised, it asks for a clearer shot.',
  },
  {
    q: 'How is "Sleep" verified?',
    a: 'Photo of your bed (e.g. a morning shot, or your wearable\'s sleep-graph screen). The detector confirms a bed is in frame. For wearable users, a screenshot of last night\'s sleep summary works too.',
  },
  {
    q: 'How is "Strength training" verified?',
    a: 'Photo of you mid-exercise with your full body in frame. On-device pose AI maps 17 body points and checks you\'re in an ACTIVE posture — bent torso (push-up, plank, deadlift), bent knees (squat, lunge) or raised arms (press). A selfie of you just standing is rejected. Step back so the camera sees you head-to-toe.',
  },
  {
    q: 'How is "Cardio" verified?',
    a: 'Either a photo of you mid-stride (pose AI detects a lifted leg / running posture) OR a photo clearly showing a bicycle if you cycle. Standing-still selfies don\'t pass.',
  },
  {
    q: 'Is my photo uploaded anywhere for the AI check?',
    a: 'No. The AI verification (object + pose detection) runs entirely inside your browser using TensorFlow.js — your photo never leaves your device for that step. Only once it passes is the image saved to your account as proof, and we store a fingerprint (hash) of it so the same photo can\'t be reused on another goal or day.',
  },
  {
    q: 'The AI rejected my photo but I really did the workout — what now?',
    a: 'Retake with your full body in frame (activity goals) or the object clearly visible (water/food/bed), in good light. The check is a deterrent, not a courtroom — if it keeps failing on a genuine photo, the model may be having an off moment; wait a few seconds and retry, or message us below and we\'ll credit it manually.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'Missed days don\'t auto-burn freezes. You can manually use a freeze on a past missed day (or an upcoming day you know you\'ll skip) from the Goals calendar to recover that credit.',
  },
  {
    q: 'When do failed cycles\' donations actually transfer?',
    a: 'Donations are batched monthly and transferred to your selected charity. The tagged amount + 80G receipt show in your Wallet activity immediately.',
  },
  {
    q: 'Can I cancel a cycle mid-way?',
    a: 'No. Mid-cycle cancellation would defeat the commitment device. Use freezes for known schedule conflicts.',
  },
  {
    q: 'How is the FP balance used?',
    a: 'FP buys rewards in the Rewards tab — coupons (Myntra, Cult.fit, Swiggy) and merch. FP is non-refundable and doesn\'t expire.',
  },
];

export function Support() {
  const user = useUser();
  const [open, setOpen] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated()) {
      setFeedback({ kind: 'err', text: 'Sign in to send a support message.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.post<{ delivered: boolean; via: 'smtp' | 'console'; message: string }>(
        '/support/contact',
        { subject, message }
      );
      setFeedback({
        kind: res.delivered ? 'ok' : 'warn',
        text: res.message,
      });
      setSubject('');
      setMessage('');
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Could not send. Try again.',
      });
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 8000);
    }
  };

  return (
    <div className="h-full w-full bg-surface-primary flex flex-col overflow-hidden">
      <StatusBar />
      <div className="flex-1 px-5 pt-2 pb-5 overflow-y-auto no-scrollbar space-y-3.5">
        <div className="flex items-center justify-between">
          <Link to={routes.profile} className="w-10 h-10 rounded-full bg-surface-card border border-border-soft grid place-items-center hover:bg-surface-secondary/40 transition">
            <ArrowLeft className="w-[18px] h-[18px] text-fg-primary" strokeWidth={2.2} />
          </Link>
          <h1 className="font-h font-semibold text-[16px] text-fg-primary">Support</h1>
          <div className="w-10 h-10" />
        </div>

        <div className="rounded-[20px] bg-surface-inverse text-fg-inverse p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-accent-lime grid place-items-center">
            <LifeBuoy className="w-5 h-5 text-fg-primary" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-h font-bold text-[14px]">We're here to help</div>
            <div className="text-[11px] text-white/70">Average response · 6 hours · 9 AM–9 PM IST</div>
          </div>
        </div>

        {/* Contact quick links */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="mailto:support@fitstake.app"
            className="rounded-xl bg-surface-card border border-border-soft p-3 flex flex-col gap-1.5 hover:bg-surface-secondary/40 transition"
          >
            <Mail className="w-4 h-4 text-accent-primary" strokeWidth={2.4} />
            <div className="font-h font-semibold text-[12px] text-fg-primary">Email us</div>
            <div className="text-[10px] text-fg-muted">support@fitstake.app</div>
          </a>
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-surface-card border border-border-soft p-3 flex flex-col gap-1.5 hover:bg-surface-secondary/40 transition"
          >
            <MessageCircle className="w-4 h-4 text-accent-money" strokeWidth={2.4} />
            <div className="font-h font-semibold text-[12px] text-fg-primary">WhatsApp</div>
            <div className="text-[10px] text-fg-muted">+91 99999 99999</div>
          </a>
        </div>

        {/* FAQ */}
        <h2 className="font-h font-semibold text-[13px] text-fg-primary pt-1">Frequently asked</h2>
        <div className="rounded-[20px] bg-surface-card border border-border-soft overflow-hidden">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            const isLast = i === FAQ.length - 1;
            return (
              <div key={item.q} className={!isLast ? 'border-b border-border-soft' : ''}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center gap-2 px-4 py-3.5 text-left hover:bg-surface-secondary/30 transition"
                >
                  <span className="flex-1 font-h font-semibold text-[13px] text-fg-primary">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-fg-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2.4} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 text-[12px] text-fg-secondary leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact form */}
        <h2 className="font-h font-semibold text-[13px] text-fg-primary pt-1">Still stuck? Send us a message</h2>
        <form onSubmit={send} className="rounded-[20px] bg-surface-card border border-border-soft p-4 flex flex-col gap-2.5">
          <label className="text-[10px] font-semibold tracking-wider text-fg-muted">FROM</label>
          <div className="text-[12px] text-fg-secondary">{user.email || 'demo@fitstake.app'}</div>

          <label className="text-[10px] font-semibold tracking-wider text-fg-muted pt-1">SUBJECT</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Cycle didn't resolve correctly"
            className="rounded-xl bg-surface-primary border border-border-soft px-3.5 py-2.5 text-[13px] text-fg-primary outline-none focus:border-fg-primary"
            required
            maxLength={120}
          />

          <label className="text-[10px] font-semibold tracking-wider text-fg-muted pt-1">MESSAGE</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what's going on…"
            rows={4}
            className="rounded-xl bg-surface-primary border border-border-soft px-3.5 py-2.5 text-[13px] text-fg-primary outline-none focus:border-fg-primary resize-none"
            required
            maxLength={1000}
          />

          {feedback && (
            <div className={`rounded-xl px-3 py-2 text-[12px] font-medium flex items-start gap-2 ${
              feedback.kind === 'ok'
                ? 'bg-accent-money/10 border border-accent-money/30 text-accent-money'
                : feedback.kind === 'warn'
                  ? 'bg-accent-lime/15 border border-accent-lime/40 text-fg-primary'
                  : 'bg-warning/10 border border-warning/30 text-warning'
            }`}>
              {feedback.kind === 'ok'
                ? <CircleCheck className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.4} />
                : <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.4} />}
              <span className="leading-snug">{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !subject.trim() || !message.trim()}
            className="rounded-full bg-accent-lime text-fg-primary py-3 px-4 flex items-center justify-center gap-2 hover:brightness-95 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" strokeWidth={2.4} />
            <span className="text-[13px] font-semibold">{busy ? 'Sending…' : 'Send message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
