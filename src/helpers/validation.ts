import { ChainId } from '@hashflow/sdk';

import { CHAIN_IDS,Environment, ENVIRONMENTS } from './types';

export function validateMakerName(name: string): void {
  if (!/^mm[0-9]+$/.test(name)) {
    throw new Error(
      `Maker name must be external name of format 'mm123'. Got '${name}'`
    );
  }
}

export function validateChain(chain: ChainId): void {
  if (!CHAIN_IDS.includes(chain)) {
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
