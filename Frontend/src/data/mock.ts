// Mock data layer — replace these with real API calls inside hooks/* later.
// Screens never import from this file directly; they go through hooks/.

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export const mockUser = {
  name: 'Aryan',
  initial: 'A',
  fp: 2840,
  fpEarnedToday: 90,
  tier: 'Silver' as Tier,
  fpToNextTier: 5160,
  nextTier: 'Gold' as Tier,
  walletBalance: 2450,
  available: 450,
};

export const mockCycle = {
  number: 4,
  day: 14,
  daysTotal: 30,
  threshold: 25,
  stake: 2000,
  credited: 13,
  realMisses: 0,
  freezesUsed: 1,
  freezesStarting: 3,
  endDate: 'Jun 5',
};

export type Goal = {
  id: string;
  title: string;
  icon: string;
  templateId: 'steps' | 'strength' | 'water' | 'sleep' | 'diet' | 'cardio';
  progress: string;
  done?: boolean;
};

export const mockGoals: Goal[] = [
  { id: 'steps', templateId: 'steps', title: 'Walk 10,000 steps', icon: 'footprints', progress: '6,420 / 10,000' },
  { id: 'strength', templateId: 'strength', title: 'Strength training 30m', icon: 'dumbbell', progress: 'Completed at 7:42 AM', done: true },
  { id: 'water', templateId: 'water', title: 'Drink 2L water', icon: 'droplet', progress: '1.4L / 2L' },
];

export type Coupon = {
  id: string;
  brand: string;
  brandColor: string;
  icon: string;
  expires: string;
  offer: string;
  cost: number;
  category: 'Fitness' | 'Food' | 'Wellness' | 'Tech';
  locked?: boolean;
  unlockTier?: Tier;
};

export const mockCoupons: Coupon[] = [
  { id: 'myntra', brand: 'Myntra', brandColor: '#FF3F6C', icon: 'shopping-bag', expires: 'Expires in 14 days', offer: '₹200 off on activewear', cost: 500, category: 'Fitness' },
  { id: 'cultfit', brand: 'Cult.fit', brandColor: '#3FA85C', icon: 'activity', expires: 'Expires in 21 days', offer: '1-month membership free', cost: 1200, category: 'Fitness' },
  { id: 'boat', brand: 'boAt', brandColor: '#1B3A28', icon: 'headphones', expires: 'Expires in 7 days', offer: '30% off Rockerz 450', cost: 800, category: 'Tech' },
  { id: 'healthifyme', brand: 'HealthifyMe', brandColor: '#7A9A80', icon: 'salad', expires: 'Expires in 30 days', offer: 'Pro plan 50% off', cost: 1500, category: 'Wellness' },
  { id: 'swiggy', brand: 'Swiggy Health', brandColor: '#FC8019', icon: 'utensils', expires: 'Expires in 10 days', offer: '₹150 off healthy bowls', cost: 600, category: 'Food' },
];

export type StoreItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  cost: number;
  category: 'Merch' | 'Gear' | 'Subscription' | 'Experience';
  cyclesToUnlock?: number;
  locked?: boolean;
  unlockTier?: Tier;
};

export const mockStoreItems: StoreItem[] = [
  { id: 'bottle', title: 'FitStake water bottle', subtitle: 'Branded 750ml stainless steel', icon: 'glass-water', cost: 1500, category: 'Merch', cyclesToUnlock: 0 },
  { id: 'band', title: 'Resistance band set', subtitle: 'Light / medium / heavy', icon: 'circle-dashed', cost: 2200, category: 'Gear', cyclesToUnlock: 1 },
  { id: 'cultfit-pro', title: 'Cult.fit Pro · 1 month', subtitle: 'Unlimited classes · digital delivery', icon: 'activity', cost: 3500, category: 'Subscription', cyclesToUnlock: 1 },
  { id: 'gym-pass', title: 'Gym day pass', subtitle: 'Any partner gym in your city', icon: 'dumbbell', cost: 2800, category: 'Experience', cyclesToUnlock: 1 },
  { id: 'smartwatch', title: 'Fitness tracker', subtitle: 'Heart rate · sleep · steps', icon: 'watch', cost: 12000, category: 'Gear', cyclesToUnlock: 6, locked: true, unlockTier: 'Gold' },
  { id: 'bicycle', title: 'City bicycle', subtitle: 'Single-speed commuter cycle · home delivered', icon: 'bike', cost: 30000, category: 'Gear', cyclesToUnlock: 6, locked: true, unlockTier: 'Gold' },
];

export type Transaction = {
  id: string;
  kind: 'win' | 'loss' | 'deposit' | 'withdraw';
  title: string;
  subtitle: string;
  amount: string;
  positive: boolean;
};

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    kind: 'win',
    title: 'Cycle complete · stake returned',
    subtitle: 'May 18 · 28 / 30 credited',
    amount: '+ ₹2,000',
    positive: true,
  },
  {
    id: 't2',
    kind: 'loss',
    title: 'Cycle missed · 18/30',
    subtitle: '₹2,000 → GiveIndia · Apr 28',
    amount: '− ₹2,000',
    positive: false,
  },
  {
    id: 't3',
    kind: 'win',
    title: 'Cycle complete · stake returned',
    subtitle: 'Mar 30 · 26 / 30 credited',
    amount: '+ ₹2,000',
    positive: true,
  },
];

export type SquadMember = {
  id: string;
  name: string;
  initial: string;
  color: string;
  pct: number;
  trend: 'up' | 'flat' | 'down';
  trendValue: number;
  atRisk?: boolean;
};

export const mockSquad: SquadMember[] = [
  { id: 's1', name: 'Sneha', initial: 'S', color: '#FFB562', pct: 93, trend: 'up', trendValue: 1 },
  { id: 's2', name: 'You', initial: 'A', color: '#2D5E3A', pct: 79, trend: 'flat', trendValue: 0 },
  { id: 's3', name: 'Ravi', initial: 'R', color: '#4ECDC4', pct: 79, trend: 'down', trendValue: 1 },
  { id: 's4', name: 'Mohit', initial: 'M', color: '#FF6B6B', pct: 64, trend: 'down', trendValue: 2, atRisk: true },
];

export const mockSquadStats = {
  name: 'MORNING WARRIORS',
  cycleLabel: 'Cycle 04 · Day 14',
  squadAvg: 85,
  topStreak: 13,
  members: 4,
};

export const mockTierBenefits: Record<Tier, string[]> = {
  Bronze: ['Standard rules'],
  Silver: ['+1 freeze/cycle', 'Silver coupons', 'Early drops'],
  Gold: ['+2 freezes/cycle', 'Gold-exclusive items', 'Lower audit rate'],
  Platinum: ['+3 freezes/cycle', 'Platinum-only premium items', 'Custom charity allocation'],
};
