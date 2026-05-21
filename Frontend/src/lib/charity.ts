// Charity selection — persisted in localStorage. Backend currently records every
// failed cycle as "GiveIndia" regardless; this is the UI-side preference the user
// would carry into a real payout integration once that exists.

const KEY = 'fitstake.charity';

export type Charity = {
  id: string;
  name: string;
  tagline: string;
  /** Where stake-donations would flow in a real launch. */
  focus: 'Hunger' | 'Education' | 'Health' | 'Disaster relief' | 'Environment';
};

export const CHARITIES: Charity[] = [
  { id: 'giveindia',      name: 'GiveIndia',         tagline: 'India’s most trusted donation platform',  focus: 'Disaster relief' },
  { id: 'akshaya-patra',  name: 'Akshaya Patra',     tagline: 'Daily mid-day meals for school children',     focus: 'Hunger' },
  { id: 'cry',            name: 'CRY',               tagline: 'Child Rights and You — long-term welfare',focus: 'Education' },
  { id: 'goonj',          name: 'Goonj',             tagline: 'Clothing and rural development',              focus: 'Disaster relief' },
  { id: 'smile-foundation', name: 'Smile Foundation', tagline: 'Education + healthcare for the underserved', focus: 'Health' },
  { id: 'isha-foundation', name: 'Isha Outreach',    tagline: 'Reforestation and rural rejuvenation',        focus: 'Environment' },
];

export function getSelectedCharity(): Charity {
  if (typeof window === 'undefined') return CHARITIES[0];
  const id = window.localStorage.getItem(KEY);
  return CHARITIES.find((c) => c.id === id) ?? CHARITIES[0];
}

export function setSelectedCharity(id: string) {
  window.localStorage.setItem(KEY, id);
}
