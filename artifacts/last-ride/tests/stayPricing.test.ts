import { describe, expect, it } from 'vitest';
import { formatPriceRange, stayPrice } from '@/lib/stayPricing';

/**
 * Net cafés and karaoke have no price API, and their rates are set per chain,
 * so a recognised chain gives a far better estimate than a per-category figure.
 * The UI says "chain rate" or "typical" based on that distinction.
 */
describe('stayPrice', () => {
  it('uses the chain rate when the venue belongs to a known chain', () => {
    const kaikatsu = stayPrice('快活CLUB 渋谷センター街店', 'net-cafe');
    expect(kaikatsu.chain).toBe(true);
    expect(kaikatsu.range).toEqual({ from: 1700, to: 2600 });

    const manekineko = stayPrice('カラオケまねきねこ 渋谷店', 'karaoke');
    expect(manekineko.chain).toBe(true);
    expect(manekineko.range.from).toBeLessThan(stayPrice('カラオケ館 渋谷東口店', 'karaoke').range.from);
  });

  it('falls back to the category when the chain is unknown', () => {
    const independent = stayPrice('まちの小さなネットカフェ', 'net-cafe');
    expect(independent.chain).toBe(false);
    expect(independent.range).toEqual({ from: 1500, to: 3000 });
  });

  it('prices capsule hotels below hotels', () => {
    expect(stayPrice('カプセルホテル渋谷', 'capsule').range.from).toBeLessThan(stayPrice('渋谷グランベルホテル', 'hotel').range.from);
  });
});

describe('formatPriceRange', () => {
  it('shows a range, or a "from" price when there is no upper bound', () => {
    expect(formatPriceRange({ from: 1500, to: 3000 })).toBe('¥1,500–3,000');
    expect(formatPriceRange({ from: 8000 })).toBe('¥8,000~');
  });
});
