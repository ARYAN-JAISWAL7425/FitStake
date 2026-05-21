// Static reward catalog. Mirrors Frontend/src/data/mock.ts so the visual layer
// doesn't change when we swap the hook from mock → API.

export type CouponCategory = 'Fitness' | 'Food' | 'Wellness' | 'Tech';
export type StoreCategory = 'Merch' | 'Gear' | 'Subscription' | 'Experience';
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export type Coupon = {
  id: string;
  brand: string;
  brandColor: string;
  icon: string;
  expires: string;
  offer: string;
  cost: number;
  category: CouponCategory;
};

export type StoreItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  cost: number;
  category: StoreCategory;
  cyclesToUnlock?: number;
  locked?: boolean;
  unlockTier?: Tier;
};

export const coupons: Coupon[] = [
  { id: 'myntra', brand: 'Myntra', brandColor: '#FF3F6C', icon: 'shopping-bag', expires: 'Expires in 14 days', offer: '₹200 off on activewear', cost: 500, category: 'Fitness' },
  { id: 'cultfit', brand: 'Cult.fit', brandColor: '#3FA85C', icon: 'activity', expires: 'Expires in 21 days', offer: '1-month membership free', cost: 1200, category: 'Fitness' },
  { id: 'boat', brand: 'boAt', brandColor: '#1B3A28', icon: 'headphones', expires: 'Expires in 7 days', offer: '30% off Rockerz 450', cost: 800, category: 'Tech' },
  { id: 'healthifyme', brand: 'HealthifyMe', brandColor: '#7A9A80', icon: 'salad', expires: 'Expires in 30 days', offer: 'Pro plan 50% off', cost: 1500, category: 'Wellness' },
  { id: 'swiggy', brand: 'Swiggy Health', brandColor: '#FC8019', icon: 'utensils', expires: 'Expires in 10 days', offer: '₹150 off healthy bowls', cost: 600, category: 'Food' },
];

export const storeItems: StoreItem[] = [
  { id: 'bottle', title: 'FitStake water bottle', subtitle: 'Branded 750ml stainless steel', icon: 'glass-water', cost: 1500, category: 'Merch', cyclesToUnlock: 0 },
  { id: 'band', title: 'Resistance band set', subtitle: 'Light / medium / heavy', icon: 'circle-dashed', cost: 2200, category: 'Gear', cyclesToUnlock: 1 },
  { id: 'cultfit-pro', title: 'Cult.fit Pro · 1 month', subtitle: 'Unlimited classes · digital delivery', icon: 'activity', cost: 3500, category: 'Subscription', cyclesToUnlock: 1 },
  { id: 'gym-pass', title: 'Gym day pass', subtitle: 'Any partner gym in your city', icon: 'dumbbell', cost: 2800, category: 'Experience', cyclesToUnlock: 1 },
  { id: 'smartwatch', title: 'Fitness tracker', subtitle: 'Heart rate · sleep · steps', icon: 'watch', cost: 12000, category: 'Gear', cyclesToUnlock: 6, locked: true, unlockTier: 'Gold' },
];

export const tierBenefits: Record<Tier, string[]> = {
  Bronze: ['Standard rules'],
  Silver: ['+1 freeze/cycle', 'Silver coupons', 'Early drops'],
  Gold: ['+2 freezes/cycle', 'Gold-exclusive items', 'Lower audit rate'],
  Platinum: ['+3 freezes/cycle', 'Platinum-only premium items', 'Custom charity allocation'],
};

export function findCoupon(id: string): Coupon | undefined {
  return coupons.find((c) => c.id === id);
}

export function findStoreItem(id: string): StoreItem | undefined {
  return storeItems.find((s) => s.id === id);
}

const tierRank: Record<Tier, number> = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };
export function userMeetsTier(userTier: Tier, requiredTier: Tier): boolean {
  return tierRank[userTier] >= tierRank[requiredTier];
}
