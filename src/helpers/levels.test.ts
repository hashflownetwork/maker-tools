import BigNumber from 'bignumber.js';

import { PriceLevel } from '../helpers/types';
import { computeLevelsQuote } from './levels';

function computeLevelsWrapper(
  priceLevels: PriceLevel[],
  reqBaseAmount?: BigNumber,
  reqQuoteAmount?: BigNumber
) {
  return Number(
    computeLevelsQuote(priceLevels, reqBaseAmount, reqQuoteAmount).amount
  );
}

describe('computeLevelsQuote', () => {
  test('computes a proper sell levels quote given a quotetokenamount', () => {
    expect(
      computeLevelsWrapper(
        [
          { q: '0', p: '0.99009900990099009901' },
          { q: '50.5', p: '0.99009900990099009901' },
          { q: '110', p: '0.90909090909090909091' },
        ],
        undefined,
        BigNumber('40')
      )
    ).toBeCloseTo(40.4);
  });
  test('computes a proper sell levels quote given a basetokenamount', () => {
    expect(
      Number(
        computeLevelsQuote(
          [
            { q: '0', p: '0.99009900990099009901' },
            { q: '50.5', p: '0.99009900990099009901' },
            { q: '110', p: '0.90909090909090909091' },
          ],
          BigNumber('40.4'),
          undefined
        ).amount?.toString()
      )
    ).toBeCloseTo(40);
  });
  test('computes a proper buy levels quote given a quotetokenamount', () => {
    expect(
      computeLevelsWrapper(
        [
          { q: '0', p: '0.99' },
          { q: '50.0', p: '0.99' },
          { q: '100.0', p: '0.9' },
        ],
        undefined,
        BigNumber('40')
      )
    ).toBeCloseTo(40.4);
  });
  test('computes a proper buy levels quote given a quotetokenamount', () => {
    expect(
      computeLevelsWrapper(
        [
          { q: '0', p: '0.99' },
          { q: '50.0', p: '0.99' },
          { q: '100.0', p: '0.9' },
        ],
        BigNumber('40.4'),
        undefined
      )
    ).toBeCloseTo(40);
  });
});
