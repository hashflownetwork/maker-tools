import BigNumber from 'bignumber.js';

import { computeLevelsQuote } from './levels';

describe('computeLevelsQuote', () => {
  test('computes a proper selllevels quote given a quotetokenamount', () => {
    expect(
      computeLevelsQuote(
        [
          {
            q: '0',
            p: '0.99009900990099009901',
          },
          {
            q: '50.5',
            p: '0.99009900990099009901',
          },
          {
            q: '110',
            p: '0.90909090909090909091',
          },
        ],
        undefined,
        BigNumber('40')
      ).amount?.toString()
    ).toBe('40.4');
  });
  test('computes a proper selllevels quote given a basetokenamount', () => {
    expect(
      computeLevelsQuote(
        [
          {
            q: '0',
            p: '0.99009900990099009901',
          },
          {
            q: '50.5',
            p: '0.99009900990099009901',
          },
          {
            q: '110',
            p: '0.90909090909090909091',
          },
        ],
        undefined,
        BigNumber('40.4')
      ).amount?.toString()
    ).toBe('40');
  });
});
