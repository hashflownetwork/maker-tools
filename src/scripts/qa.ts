import { Chain, ChainId, ChainType } from '@hashflow/taker-js';
import { getSecretValue } from 'helpers/secrets';
import { Environment } from 'helpers/types';
import { runQa } from 'lib/qa';
import yargs from 'yargs/yargs';

const parser = yargs(process.argv.slice(2)).options({
  maker: { string: true, demandOption: true },
  chain: { number: true, demandOption: true },
  chain_type: { string: true, default: 'evm' },
  quote_chain: { number: true },
  quote_chain_type: { string: true, default: 'evm' },
  check_all_xchain: { boolean: true, default: false },
  base_token: { string: true, default: undefined },
  quote_token: { string: true, default: undefined },
  env: { string: true, default: 'staging' },
  num_requests: { number: true, default: 30 },
  delay_ms: { number: true, default: 0 },
});

async function getAuthKey(): Promise<{ name: string; key: string }> {
  const AUTH_SECRET_NAME = process.env.AUTH_SECRET_NAME;
  if (!AUTH_SECRET_NAME) {
    const SOURCE = process.env.SOURCE ?? 'qa';
    const AUTH_KEY = process.env.AUTH_KEY;
    if (!AUTH_KEY) {
      throw new Error(
        `Please specify your auth key in src/.env under AUTH_KEY`
      );
    }
    return { name: SOURCE, key: AUTH_KEY };
  } else {
    const AUTH_SECRET_REGION = process.env.AUTH_SECRET_REGION;
    if (!AUTH_SECRET_REGION) {
      throw new Error(`Please specify your AUTH_SECRET_REGION in src/.env`);
    }
    const secretJson = await getSecretValue(
      AUTH_SECRET_REGION,
      AUTH_SECRET_NAME
    );
    const { name, key } = JSON.parse(secretJson);
    if (!key) {
      throw new Error(`Unable to parse key from secrets manager`);
    }
    return { name, key };
  }
}

async function main() {
  const { name, key } = await getAuthKey();

  const argv = await parser.argv;
  const maker = argv.maker;
  const chainType = argv.chain_type as ChainType;
  const chainId = argv.chain as ChainId;
  const chain: Chain = { chainType, chainId };
  const env = argv.env as Environment;
  const quoteChainType = argv.quote_chain_type as ChainType;
  const quoteChainId = argv.quote_chain as ChainId;
  const quoteChain = quoteChainId
    ? { chainId: quoteChainId, chainType: quoteChainType }
    : undefined;
  const evmQaAddress = process.env.QA_TAKER_ADDRESS?.toLowerCase();
  const solanaQaAddress = process.env.QA_TAKER_ADDRESS_SOLANA;

  process.exit(
    await runQa(
      name,
      key,
      env,
      maker,
      argv.num_requests,
      argv.delay_ms,
      chain,
      quoteChain,
      argv.check_all_xchain,
      argv.base_token,
      argv.quote_token,
      evmQaAddress,
      solanaQaAddress
    )
  );
}

main();
