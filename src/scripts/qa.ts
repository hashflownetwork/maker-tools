import { Chain, ChainId, ChainType, HashflowApi } from '@hashflow/taker-js';
import { PriceLevel } from '@hashflow/taker-js/dist/types/common';
import BigNumber from 'bignumber.js';
import yargs from 'yargs/yargs';

import { computeLevelsQuote } from '../helpers/levels';
import { convertFromDecimals, convertToDecimals } from '../helpers/token';
import { Environment, Token } from '../helpers/types';
import {
  validateAddress,
  validateChain,
  validateEnvironment,
  validateMakerName,
} from '../helpers/validation';

const parser = yargs(process.argv.slice(2)).options({
  maker: { string: true, demandOption: true },
  chain: { number: true, demandOption: true },
  chainType: { string: true, default: 'evm' },
  base_token: { string: true, default: undefined },
  quote_token: { string: true, default: undefined },
  env: { string: true, default: 'staging' },
  num_requests: { number: true, default: 30 },
  delay_ms: { number: true, default: 0 },
});

async function handler(): Promise<void> {
  const QA_ADDRESS = process.env.QA_TAKER_ADDRESS;
  if (!QA_ADDRESS) {
    throw new Error(
      `Please specify the taker address you want to use for QA in src/.env under QA_ADDRESS`
    );
  }
  validateAddress(QA_ADDRESS);

  const SOURCE = process.env.SOURCE ?? 'qa';
  const AUTH_KEY = process.env.AUTH_KEY;
  if (!AUTH_KEY) {
    throw new Error(`Please specify your auth key in src/.env under AUTH_KEY`);
  }

  const argv = await parser.argv;

  const maker = argv.maker;
  const chain: Chain = {
    chainId: argv.chain as ChainId,
    chainType: argv.chainType as ChainType,
  };
  const env = argv.env as Environment;
  validateMakerName(maker);
  validateChain(chain);
  validateEnvironment(env);

  const hashflow = new HashflowApi('taker', SOURCE, AUTH_KEY, env);

  const numRequests = argv.num_requests;
  const delayMs = argv.delay_ms;
  const delayMsStr =
    delayMs > 0 ? ` using a delay of ${delayMs}ms between RFQs` : '';

  const pairProvided = argv.base_token && argv.quote_token;

  process.stdout.write(
    `QA testing maker '${maker}' against ${env} on chain ${chain.chainType}:${chain.chainId} ${
      pairProvided ? ` for ${argv.base_token}-${argv.quote_token}` : ''
    } with ${numRequests} requests/pair${delayMsStr}.\n\n`
  );

  process.stdout.write('Finding active makers ... ');
  const makers: string[] = [];
  try {
    const chainMakers = await hashflow.getMarketMakers(
      chain,
      undefined,
      maker
    );
    for (const externalMaker of chainMakers) {
      const makerPrefix = externalMaker.split('_')[0];
      if (makerPrefix === maker) {
        makers.push(externalMaker);
      }
    }

    if (!makers.length) {
      process.stdout.write(
        `failed! No maker available ${JSON.stringify(chainMakers)}\n`
      );
      process.exit(0);
    }
  } catch (err) {
    process.stdout.write(`failed!  ${(err as Error).toString()}\n`);
    process.exit(0);
  }

  const makersString = makers.length > 1 ? JSON.stringify(makers) : makers[0];
  process.stdout.write(`done.  ${makersString}\n`);

  const makerLevels: Record<
    string,
    {
      baseToken: Token;
      quoteToken: Token;
      levels: PriceLevel[];
    }[]
  > = {};
  process.stdout.write(`Fetching levels for ${makersString} ... `);

  try {
    const levels = await hashflow.getPriceLevels(chain, makers);
    const retrievedMakers = Object.keys(levels);
    if (!retrievedMakers.length) {
      process.stdout.write(`failed!  No maker levels.\n`);
      process.exit(0);
    }

    for (const retrievedMaker of retrievedMakers) {
      const mPairs = levels[retrievedMaker];
      if (!mPairs || !mPairs.length) {
        process.stdout.write(`failed!  No levels for ${retrievedMaker}.\n`);
        process.exit(0);
      }

      if (!makerLevels[retrievedMaker]) {
        makerLevels[retrievedMaker] = [];
      }
      for (const entry of mPairs) {
        const { pair, levels } = entry;
        if (
          pairProvided &&
          !(
            pair.baseTokenName === argv.base_token &&
            pair.quoteTokenName === argv.quote_token
          )
        ) {
          continue;
        }

        if (!levels.length) {
          process.stdout.write(
            ` No levels for ${retrievedMaker} on ${entry.pair.baseTokenName}-${entry.pair.quoteTokenName}. Continuing with next pair...\n`
          );
          continue;
        }

        const baseToken = {
          chain,
          address: entry.pair.baseToken,
          name: entry.pair.baseTokenName,
          decimals: entry.pair.baseTokenDecimals,
        };
        const quoteToken = {
          chain,
          address: entry.pair.quoteToken,
          name: entry.pair.quoteTokenName,
          decimals: entry.pair.quoteTokenDecimals,
        };
        makerLevels[retrievedMaker]!.push({ baseToken, quoteToken, levels });
      }
    }
  } catch (err) {
    process.stdout.write(`failed!  ${(err as Error).toString()}\n`);
    process.exit(0);
  }
  process.stdout.write('done\n');

  for (const maker of Object.keys(makerLevels)) {
    for (const entry of makerLevels[maker]!) {
      const pairStr = `${entry.baseToken.name}-${entry.quoteToken.name}`;
      process.stdout.write(`Requesting RFQs for ${maker}: ${pairStr} ... `);

      try {
        const { successRate, biasBps, deviationBps, results } = await testRfqs(
          hashflow,
          QA_ADDRESS,
          numRequests,
          delayMs,
          maker,
          chain,
          entry
        );

        const levels = entry.levels;
        const minLevel = new BigNumber(levels[0]?.q ?? '0')
          .precision(7)
          .toFormat();
        const maxLevel = new BigNumber(levels[levels.length - 1]?.q ?? '0')
          .precision(7)
          .toFormat();

        const successRateStr = `${(100 * successRate).toFixed(2)}%`;
        const biasStr = `${biasBps > 0 ? '+' : ''}${new BigNumber(biasBps)
          .precision(4)
          .toFixed()} bps`;
        const stdDevStr = `${new BigNumber(deviationBps)
          .precision(4)
          .toFixed()} bps`;

        process.stdout.write('done\n');
        console.log(
          `\nSuccess rate: ${successRateStr}  Avg bias: ${biasStr}  Std deviation: ${stdDevStr}`
        );
        console.log(
          `Min level: ${minLevel} ${entry.baseToken.name}  Max level: ${maxLevel} ${entry.baseToken.name}`
        );

        console.log(`\n[P] = Provided in RFQ   [M] = Received from Maker`);

        const maxBaseDp = Math.max(
          ...results.map(r => r.baseAmount?.precision(7).dp() ?? 0)
        );
        const maxQuoteDp = Math.max(
          ...results.map(r => r.quoteAmount?.precision(7).dp() ?? 0)
        );

        const maxBaseDigits = Math.max(
          ...results.map(r => r.baseAmount?.toFormat(maxBaseDp).length ?? 0)
        );
        const maxQuoteDigits = Math.max(
          ...results.map(r => r.quoteAmount?.toFormat(maxQuoteDp).length ?? 0)
        );
        const maxFeesDigits = Math.max(
          ...results.map(r => r.feeBps?.toString().length ?? 0)
        );
        const padDevDegits = Math.max(
          ...results.map(
            r =>
              `${r?.deviationBps?.gt(0) ? '+' : ''}${r?.deviationBps
                ?.precision(3)
                .toFixed()}`.length
          )
        );
        const maxExpectedDigits = Math.max(maxBaseDigits, maxQuoteDigits);
        const maxRfqIdLength = Math.max(
          ...results.map(r =>
            r.rfqIds?.length ? JSON.stringify(r.rfqIds).length : 0
          )
        );

        for (let i = 0; i < results.length; i++) {
          const r = results[i];

          const { baseAmountStr, quoteAmountStr } =
            r?.provided === 'base'
              ? {
                  baseAmountStr: `[P] base: ${r?.baseAmount
                    ?.toFormat(maxBaseDp)
                    .padStart(maxBaseDigits, ' ')} ${entry.baseToken.name}`,
                  quoteAmountStr: `[M] quote: ${r?.quoteAmount
                    ?.toFormat(maxQuoteDp)
                    .padStart(maxQuoteDigits, ' ')} ${entry.quoteToken.name}`,
                }
              : {
                  baseAmountStr: `[M] base: ${r?.baseAmount
                    ?.toFormat(maxBaseDp)
                    .padStart(maxBaseDigits, ' ')} ${entry.baseToken.name}`,
                  quoteAmountStr: `[P] quote: ${r?.quoteAmount
                    ?.toFormat(maxQuoteDp)
                    .padStart(maxQuoteDigits, ' ')} ${entry.quoteToken.name}`,
                };

          const { t: tokenExp, dp: maxExpDp } =
            r?.provided === 'base'
              ? { t: entry.quoteToken.name, dp: maxQuoteDp }
              : { t: entry.baseToken.name, dp: maxBaseDp };

          const expectedAmountStr = `expected: ${r?.expectedAmount
            ?.toFormat(maxExpDp)
            ?.padStart(maxExpectedDigits, ' ')} ${tokenExp.padEnd(
            Math.max(entry.baseToken.name.length, entry.quoteToken.name.length),
            ' '
          )}`;

          const devSign = r?.deviationBps?.gt(0) ? '+' : '';
          const deviation = `${devSign}${r?.deviationBps
            ?.precision(3)
            .toFixed()}`;
          const deviationStr = `diff: ${deviation.padStart(
            padDevDegits,
            ' '
          )} bps`;
          const feesStr = `fees: ${r?.feeBps
            ?.toString()
            .padStart(maxFeesDigits, ' ')} bps`;
          const failStr = r?.failMsg ? `failed! ${r.failMsg}` : '';

          const indexStr = i.toString().padStart(2, '0');
          const rfqIdStr = r?.rfqIds?.length
            ? JSON.stringify(r.rfqIds)
            : '[--]';

          console.log(
            `[${indexStr}] ${rfqIdStr.padEnd(
              maxRfqIdLength,
              ' '
            )}  ${baseAmountStr}  ${quoteAmountStr}  ${expectedAmountStr}  ${deviationStr}  ${feesStr}  ${failStr}`
          );
        }

        console.log('\n');
      } catch (err) {
        process.stdout.write(
          `failed!  ${(err as Error).toString()}. ${JSON.stringify(entry)}\n`
        );
        process.exit(0);
      }
    }
  }

  process.stdout.write('QA test completed.\n');
  process.exit(0);
}

async function testRfqs(
  hashflow: HashflowApi,
  wallet: string,
  numRequests: number,
  delayMs: number,
  maker: string,
  chain: Chain,
  entry: { baseToken: Token; quoteToken: Token; levels: PriceLevel[] }
): Promise<{
  successRate: number;
  biasBps: number;
  deviationBps: number;
  results: {
    provided: 'base' | 'quote';
    baseAmount?: BigNumber;
    quoteAmount?: BigNumber;
    expectedAmount?: BigNumber;
    deviationBps?: BigNumber;
    feeBps?: number;
    failMsg?: string;
    rfqIds?: string[];
  }[];
}> {
  let numSuccess = 0;
  let sumBiasBps = 0;
  const deviationEntries: BigNumber[] = [];

  // Compute min and max levels
  const preLevels = entry.levels;

  if (preLevels.length === 1) {
    throw new Error(
      `Levels for ${maker} only have one entry: ${JSON.stringify(entry)}`
    );
  }

  const minLevel = new BigNumber(preLevels[0]?.q ?? '0');
  const maxLevel = BigNumber.max(
    new BigNumber(preLevels[preLevels.length - 1]?.q ?? '0').multipliedBy(
        0.95
    ),
    minLevel
  );

  const sendRfq = async (): Promise<{
    provided: 'base' | 'quote';
    baseAmount?: BigNumber;
    quoteAmount?: BigNumber;
    expectedAmount?: BigNumber;
    deviationBps?: BigNumber;
    feeBps?: number;
    failMsg?: string;
    rfqIds?: string[];
  }> => {
    const { baseToken, quoteToken } = entry;

    const provided = Math.random() < 0.5 ? 'base' : 'quote';
    const baseAmount = new BigNumber(Math.random())
      .multipliedBy(maxLevel.minus(minLevel))
      .plus(minLevel);

    const { failure, amount: quoteAmount } = computeLevelsQuote(
      preLevels,
      baseAmount
    );
    if (failure || !quoteAmount) {
      const failMsg = `Could not estimate pre-RFQ prices: ${failure}. ${JSON.stringify(
        preLevels
      )}`;
      return { provided, baseAmount, quoteAmount: undefined, failMsg };
    }

    const { b: baseTokenAmount, q: quoteTokenAmount } =
      provided === 'base'
        ? {
            b: convertToDecimals(baseAmount, baseToken).toFixed(0),
            q: undefined,
          }
        : {
            b: undefined,
            q: convertToDecimals(quoteAmount, quoteToken).toFixed(0),
          };

    // Pick random int fee between 0 and 10 bps (incl)
    const feeBps = Math.round(Math.random() * 10);
    const feeFactor = new BigNumber(1).minus(
      new BigNumber(feeBps).dividedBy(10_000)
    );

    try {
      /* Request fresh levels and RFQ */
      const [levelsMap, rfq] = await Promise.all([
        hashflow.getPriceLevels(chain, [maker]),
        hashflow.requestQuote({
          baseChain: chain, // TODO: support specifying quoteChain as well
          baseToken: baseToken.address,
          quoteToken: quoteToken.address,
          baseTokenAmount,
          quoteTokenAmount,
          wallet,
          marketMakers: [maker],
          feeBps,
          debug: true,
        }),

      ]);

      /* Parse levels */
      const levels = levelsMap[maker]?.find(
        e =>
          e.pair.baseToken === baseToken.address &&
          e.pair.quoteToken === quoteToken.address
      )?.levels;
      if (!levels) {
        return {
          provided,
          baseAmount,
          quoteAmount,
          feeBps,
          failMsg: `No levels for ${maker}. Received: ${JSON.stringify(
            levelsMap
          )}`,
        };
      }

      /* Compute expected amounts (including fees) */
      const expectedToken = provided === 'base' ? quoteToken : baseToken;
      const expectedAmount =
        provided === 'base'
          ? extractExpectedAmount(levels, baseAmount, undefined)?.multipliedBy(
              feeFactor
            )
          : extractExpectedAmount(levels, undefined, quoteAmount)?.dividedBy(
              feeFactor
            );
      if (!expectedAmount) {
        return {
          provided,
          baseAmount: provided === 'base' ? baseAmount : undefined,
          quoteAmount: provided === 'quote' ? quoteAmount : undefined,
          failMsg: `Could not estimate post-RFQ prices: ${failure}. ${JSON.stringify(
            levels
          )}`,
        };
      }
      const expectedAmountDecimals = convertToDecimals(
        expectedAmount,
        expectedToken
      );
      if (rfq.status === 'success') {
        rfq.quotes
      }
      /* Check quote data*/
      if (rfq.status === 'fail') {
        return {
          provided,
          baseAmount,
          quoteAmount,
          expectedAmount,
          feeBps,
          rfqIds: rfq.internalRfqIds ?? [],
          failMsg: `No quote data. Received error: ${JSON.stringify(
            rfq.error
          )}`,
        };
      }
      const receivedAmountDecimals = new BigNumber(
        provided === 'base'
          ? rfq?.quotes?.[0]?.quoteData?.quoteTokenAmount ?? '0'
          : rfq?.quotes?.[0]?.quoteData?.baseTokenAmount ?? '0'
      );
      const receivedAmount = convertFromDecimals(
        receivedAmountDecimals,
        expectedToken
      );

      /* Compute RFQ-levels deviation */
      const deviationFactor = provided === 'base' ? -1 : 1;
      let deviationBps = receivedAmountDecimals
        .minus(expectedAmountDecimals)
        .multipliedBy(deviationFactor)
        .dividedBy(expectedAmountDecimals)
        .multipliedBy(10_000)
        .decimalPlaces(2);
      if (deviationBps.isNaN() || deviationBps.isZero()) {
        deviationBps = new BigNumber(0);
      }

      /* Compute success stats */
      numSuccess += 1;
      sumBiasBps += deviationBps.toNumber();
      deviationEntries.push(deviationBps);

      return {
        provided,
        baseAmount: provided === 'base' ? baseAmount : receivedAmount,
        quoteAmount: provided === 'quote' ? quoteAmount : receivedAmount,
        expectedAmount,
        deviationBps,
        feeBps,
        rfqIds: rfq.internalRfqIds ?? [],
      };
    } catch (err) {
      return {
        provided,
        failMsg: `Error occurred: ${(err as Error).toString()}`,
      };
    }
  };

  const resultPromises: ReturnType<typeof sendRfq>[] = [];
  for (let i = 0; i < numRequests; i++) {
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
    resultPromises.push(sendRfq());
  }

  const results = await Promise.all(resultPromises);

  const biasBps = sumBiasBps / numSuccess;
  const sumSquaredDeviation = deviationEntries
    .map(d => d.minus(biasBps).pow(2))
    .reduce((cur, next) => cur.plus(next), new BigNumber(0));

  return {
    successRate: numSuccess / numRequests,
    biasBps: sumBiasBps / numSuccess,
    deviationBps: sumSquaredDeviation.dividedBy(numSuccess).sqrt().toNumber(),
    results,
  };
}

function extractExpectedAmount(
  levels: PriceLevel[],
  baseAmount: BigNumber | undefined,
  quoteAmount: BigNumber | undefined
): BigNumber | undefined {
  const { failure, amount } = computeLevelsQuote(
    levels,
    baseAmount,
    quoteAmount
  );
  return !failure && !!amount ? amount : undefined;
}

handler();
