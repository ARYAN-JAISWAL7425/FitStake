export const routes = {
  onboarding: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  goalSetup: '/goal-setup',
  stakeSelect: '/stake',
  home: '/home',
  goals: '/goals',
  wallet: '/wallet',
  rewards: '/rewards',
  profile: '/profile',
  planReview: '/plan-review',
  cycleComplete: '/cycle-complete',
  missed: '/missed',
  group: '/group',
  privacy: '/privacy',
  charity: '/charity',
  support: '/support',
} as const;

export type RouteKey = keyof typeof routes;
