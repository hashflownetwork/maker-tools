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

