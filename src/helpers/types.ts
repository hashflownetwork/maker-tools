import { Networks } from '@hashflow/sdk';
import { Chain, ChainId, ChainType } from '@hashflow/taker-js';
import BigNumber from 'bignumber.js';

export const ENVIRONMENTS = ['development', 'production', 'staging'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export type PriceLevel = {
  q: string;
  p: string;
};

export type PriceLevelBN = {
  q: BigNumber;
  p: BigNumber;
};

export type Token = {
  chain: Chain;
  name: string;
  address: string;
  decimals: number;
};

type NetworkName = keyof typeof Networks;

export const CHAIN_TYPES: ChainType[] = ['evm', 'solana'];
export const CHAIN_IDS: ChainId[] = Object.keys(Networks).map(
  k => Networks[k as NetworkName]!.chainId as ChainId
);
