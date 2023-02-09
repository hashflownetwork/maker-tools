import { ChainId, Networks } from '@hashflow/sdk';
import BigNumber from 'bignumber.js';

export const ENVIRONMENTS = ['development', 'production', 'staging'] as const;
export type Environment = typeof ENVIRONMENTS[number];

export type PriceLevel = {
  level: string;
  price: string;
};

export type PriceLevelBN = {
  level: BigNumber;
  price: BigNumber;
};

export type Token = {
  chainId: ChainId;
  name: string;
  address: string;
  decimals: number;
};

type NetworkName = keyof typeof Networks;
export const NETWORK_IDS: ChainId[] = Object.keys(Networks).map(
  k => Networks[k as NetworkName]!.chainId as ChainId
);
