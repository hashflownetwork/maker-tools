import { BigNumber } from 'bignumber.js';

import { Token } from './types';

export function convertFromDecimals(
  amount: BigNumber,
  token: Token
): BigNumber {
  return amount.dividedBy(new BigNumber(10).pow(token.decimals));
}

export function convertToDecimals(amount: BigNumber, token: Token): BigNumber {
  return amount.multipliedBy(new BigNumber(10).pow(token.decimals));
}
