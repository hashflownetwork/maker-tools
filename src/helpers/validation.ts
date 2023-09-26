import { Chain } from '@hashflow/taker-js';

import { CHAIN_IDS, CHAIN_TYPES, Environment, ENVIRONMENTS } from './types';

export function validateMakerName(name: string): void {
  if (!/^mm[0-9]+$/.test(name)) {
    throw new Error(
      `Maker name must be external name of format 'mm123'. Got '${name}'`
    );
  }
}

export function validateChain(chain: Chain): void {
  // TODO(ENG-2176): change CHAIN_IDS/CHAIN_TYPES -> CHAINS
  if (!CHAIN_IDS.includes(chain.chainId) && CHAIN_TYPES.includes(chain.chainType)) {
    throw new Error(`Unrecognized chain: ${chain}`);
  }
}

export function validateEnvironment(env: Environment): void {
  if (!ENVIRONMENTS.includes(env)) {
    throw new Error(`Unrecognized environment ${env}`);
  }
}

export function validateAddress(address: string): void {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
}
