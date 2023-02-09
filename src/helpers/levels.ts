import BigNumber from 'bignumber.js';

import { PriceLevel, PriceLevelBN } from './types';

export function toPriceLevelsBN(
  priceLevels: PriceLevel[],
  options?: { invert: boolean }
): PriceLevelBN[] {
  const invert = options?.invert ?? false;
  return priceLevels.map(l => {
    const price = new BigNumber(l.price);
    return {
      level: new BigNumber(l.level),
      price: invert ? new BigNumber(1).dividedBy(price) : price,
    };
  });
}

export function computeLevelsQuote(
  priceLevels: PriceLevel[],
  reqBaseAmount?: BigNumber,
  reqQuoteAmount?: BigNumber
):
  | { amount: BigNumber; failure?: undefined }
  | {
      failure: 'insufficient_liquidity' | 'below_minimum_amount';
      amount?: undefined;
    } {
  if (reqBaseAmount && reqQuoteAmount) {
    throw new Error(`Base amount and quote amount cannot both be specified`);
  }

  const levels = toPriceLevelsBN(priceLevels);
  if (!levels.length) {
    return { failure: 'insufficient_liquidity' };
  }

  const quote = {
    baseAmount: levels[0]!.level,
    quoteAmount: levels[0]!.level.multipliedBy(levels[0]!.price),
  };
  if (
    (reqBaseAmount && reqBaseAmount.lt(quote.baseAmount)) ||
    (reqQuoteAmount && reqQuoteAmount.lt(quote.quoteAmount))
  ) {
    return { failure: 'below_minimum_amount' };
  }

  for (let i = 1; i < levels.length; i++) {
    const nextLevel = levels[i]!;
    const nextLevelDepth = nextLevel.level.minus(levels[i - 1]!.level);
    const nextLevelQuote = quote.quoteAmount.plus(
      nextLevelDepth.multipliedBy(nextLevel.price)
    );
    if (reqBaseAmount && reqBaseAmount.lte(nextLevel.level)) {
      const baseDifference = reqBaseAmount.minus(quote.baseAmount);
      const quoteAmount = quote.quoteAmount.plus(
        baseDifference.multipliedBy(nextLevel.price)
      );
      return { amount: quoteAmount };
    } else if (reqQuoteAmount && reqQuoteAmount.lte(nextLevelQuote)) {
      const quoteDifference = reqQuoteAmount.minus(quote.quoteAmount);
      const baseAmount = quote.baseAmount.plus(
        quoteDifference.dividedBy(nextLevel.price)
      );
      return { amount: baseAmount };
    }

    quote.baseAmount = nextLevel.level;
    quote.quoteAmount = nextLevelQuote;
  }

  return { failure: 'insufficient_liquidity' };
}
