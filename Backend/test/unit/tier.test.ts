import { describe, it, expect } from 'vitest';
import { tierForFp, nextTierOf, TIER_FLOOR } from '../../src/lib/tier';

describe('tierForFp', () => {
  it('returns Bronze for 0 FP', () => {
    expect(tierForFp(0)).toBe('Bronze');
  });
  it('returns Bronze just below the Silver floor', () => {
    expect(tierForFp(TIER_FLOOR.Silver - 1)).toBe('Bronze');
  });
  it('promotes to Silver at exactly the Silver floor', () => {
    expect(tierForFp(TIER_FLOOR.Silver)).toBe('Silver');
  });
  it('promotes to Gold at the Gold floor', () => {
    expect(tierForFp(TIER_FLOOR.Gold)).toBe('Gold');
  });
  it('promotes to Platinum at the Platinum floor', () => {
    expect(tierForFp(TIER_FLOOR.Platinum)).toBe('Platinum');
  });
  it('stays Platinum well above the floor', () => {
    expect(tierForFp(TIER_FLOOR.Platinum * 5)).toBe('Platinum');
  });
});

describe('nextTierOf', () => {
  it('Bronze → Silver', () => expect(nextTierOf('Bronze')).toBe('Silver'));
  it('Silver → Gold', () => expect(nextTierOf('Silver')).toBe('Gold'));
  it('Gold → Platinum', () => expect(nextTierOf('Gold')).toBe('Platinum'));
  it('Platinum → null (top tier)', () => expect(nextTierOf('Platinum')).toBeNull());
});
