import { Environment, ENVIRONMENTS } from './types';

export function validateMakerName(name: string): void {
  if (!/^mm[0-9]+$/.test(name)) {
    throw new Error(
      `Maker name must be external name of format 'mm123'. Got '${name}'`
    );
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
