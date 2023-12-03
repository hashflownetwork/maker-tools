import { runQa } from 'helpers/qa';
import { getSecretValue } from 'helpers/secrets';
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

  process.exit(await runQa(argv, name, key));
}

main();
