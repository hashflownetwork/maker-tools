# Hashflow Maker Tools
Welcome! This repo contains tools to help market makers operate on Hashflow.

If you have any questions, don't hesitate to reach out on our existing communication channels.

If you're looking to become a market maker on Hashflow, see [this form](https://docs.google.com/forms/d/e/1FAIpQLScavwRyXivjzXhAdro45X8EAoucIKDOOAUvlm9uVegmJjEwVA/viewform). 

## QA Script
This repo includes a script to do quality assurance testing of your integration. 

#### Running the script
To run this script, follow these steps:
1. Clone the [maker-tools](https://github.com/hashflownetwork/maker-tools) repo
2. Navigate to `src/` and run `yarn`
3. Copy `src/.env.example` to `src/.env` and set the environment variables:
    * ***`AUTH_KEY`***: Use your maker authorization key here. This is the same key you provide when connecting to our maker WebSocket.
      * Wallets: In the current iteration, no funds are transferred. This is just used to fill in the `trader` field in the RFQs you get.
        * ***`QA_TAKER_ADDRESS`***: Put the EVM address of the wallet you want to use for testing. 
        * ***`QA_TAKER_ADDRESS_SOLANA`*** Put the Solana address of the wallet you want to use for testing. 
4. Finally, run `yarn qa <options>` with the following options:
    * ***`--maker`***: your external maker name (e.g. `--maker=mm123`)
    * ***`--chain`***: chain id that you want to test (e.g. `--chain=137`)
    * ***(Optional) `--chain_type`***: chain type to test (either `evm` or `solana`. Default: `evm`)
    * ***(Optional) `--quote_chain`***: quote chain to test. If not set, we will use the base_chain.
    * ***(Optional) `--quote_chain_type`***: quote chain type to test. (Default: 'evm')
    * ***(Optional) `--check_all_xchain`***: if true, request quotes for all intra-chain and cross-chain quotes available for the provided base chain. (Default: `false`)
    * ***(Optional) `--base_token`***: base token name if you want to only test a specific pair (e.g. `--base_token=ETH`). If this is set, you also need to provide `--quote_token`. If this is not set, we'll test all pairs on the provided `chain`.
    * ***(Optional) `--quote_token`***: quote token name if you want to only test a specific pair (e.g. `--quote_token=ETH`). If this is set, you also need to provide `--base_token`. If this is not set, we'll test all pairs on the provided `chain`.
    * ***(Optional) `--env`***: Environment to test against. Default is `--env=staging`, the other option is `--env=production`. This will route your requests against `api-staging.hashflow.com` or `api.hashflow.com` respectively.
    * ***(Optional) `--num_requests`***: Number of RFQs to send for each pair. Default is `--num_requests=30`.
    * ***(Optional) `--delay_ms`***: Delay to introduce between each RFQ in milliseconds. This can be useful to test pricing skew over a longer period of time. Default is `--delay_ms=0`.
    * ***(Optional) `--seed`***: Set the random number generator seed to provide replicatable results.
    
#### Interpreting the results
When running the script, you're going to see output in the terminal that looks something like this (slightly edited version):

```
» yarn qa --maker=mm4 --chain=10 --num_requests=10  --env=production

QA testing maker 'mm4' against production on chain 10 with 10 requests/pair.

Finding active makers ... done.  mm4
Fetching levels for mm4 ... done
Requesting RFQs for mm4: USDC-USDT ... done

Success rate: 100.00%  Avg bias: 0 bps  Std deviation: 0 bps
Min level: 0 USDC  Max level: 530,515.3 USDC

[P] = Provided in RFQ   [M] = Received from Maker
[00] ["0x1d67...8c0000"]  [P] base: 470,828.62 USDC  [M] quote: 470,363.70 USDT  expected: 470,363.70 USDT  diff: 0 bps  fees:  7 bps  
[01] ["0x1d67...020000"]  [P] base: 490,784.92 USDC  [M] quote: 490,539.45 USDT  expected: 490,539.45 USDT  diff: 0 bps  fees:  2 bps  
[02] ["0x1d67...9f0000"]  [M] base:  76,874.62 USDC  [P] quote:  76,856.02 USDT  expected:  76,874.62 USDC  diff: 0 bps  fees:  0 bps  
[03] ["0x1d67...a40000"]  [M] base: 184,908.70 USDC  [P] quote: 184,808.50 USDT  expected: 184,908.70 USDC  diff: 0 bps  fees:  3 bps  
[04] ["0x1d67...8c0000"]  [M] base:  33,498.08 USDC  [P] quote:  33,476.58 USDT  expected:  33,498.08 USDC  diff: 0 bps  fees:  4 bps  
[05] ["0x1d67...7a40000"]  [P] base: 341,949.86 USDC  [M] quote: 341,696.17 USDT  expected: 341,696.17 USDT  diff: 0 bps  fees:  5 bps  
[06] ["0x1d67...1e0000"]  [M] base:  65,366.74 USDC  [P] quote:  65,337.85 USDT  expected:  65,366.74 USDC  diff: 0 bps  fees:  2 bps  
[07] ["0x1d67...8c0000"]  [P] base: 438,157.73 USDC  [M] quote: 437,952.37 USDT  expected: 437,952.37 USDT  diff: 0 bps  fees:  2 bps  
[08] ["0x1d67...a40000"]  [P] base: 196,388.97 USDC  [M] quote: 196,145.11 USDT  expected: 196,145.11 USDT  diff: 0 bps  fees: 10 bps  
[09] ["0x1d67...9f0000"]  [M] base:  36,444.16 USDC  [P] quote:  36,413.48 USDT  expected:  36,444.16 USDC  diff: 0 bps  fees:  6 bps  


Requesting RFQs for mm4: USDT-USDC ... done

Success rate: 100.00%  Avg bias: 0 bps  Std deviation: 0 bps
Min level: 0 USDT  Max level: 188,761.3 USDT

[P] = Provided in RFQ   [M] = Received from Maker
[00] ["0x1d67...1e0000"]  [P] base:  52,561.30 USDT  [M] quote:  52,541.43 USDC  expected:  52,541.43 USDC  diff: 0 bps  fees: 4 bps  
[01] ["0x1d67...a40000"]  [M] base: 165,096.17 USDT  [P] quote: 164,997.73 USDC  expected: 165,096.17 USDT  diff: 0 bps  fees: 5 bps  
[02] ["0x1d67...9f0000"]  [M] base:  48,451.05 USDT  [P] quote:  48,423.05 USDC  expected:  48,451.05 USDT  diff: 0 bps  fees: 6 bps  
[03] ["0x1d67...a40000"]  [P] base:  15,183.47 USDT  [M] quote:  15,177.73 USDC  expected:  15,177.73 USDC  diff: 0 bps  fees: 4 bps  
[04] ["0x1d67...020000"]  [P] base:  96,077.66 USDT  [M] quote:  95,999.43 USDC  expected:  95,999.43 USDC  diff: 0 bps  fees: 8 bps  
[05] ["0x1d67...1e0000"]  [P] base: 164,526.87 USDT  [M] quote: 164,412.42 USDC  expected: 164,412.42 USDC  diff: 0 bps  fees: 6 bps  
[06] ["0x1d67...1e0001"]  [P] base: 100,427.47 USDT  [M] quote: 100,335.16 USDC  expected: 100,335.16 USDC  diff: 0 bps  fees: 9 bps  
[07] ["0x1d67...9f0000"]  [P] base: 102,847.68 USDT  [M] quote: 102,794.02 USDC  expected: 102,794.02 USDC  diff: 0 bps  fees: 5 bps  
[08] ["0x1d67...020000"]  [M] base:  68,840.11 USDT  [P] quote:  68,806.42 USDC  expected:  68,840.11 USDT  diff: 0 bps  fees: 5 bps  
[09] ["0x1d67...8c0000"]  [P] base:  80,644.11 USDT  [M] quote:  80,579.87 USDC  expected:  80,579.87 USDC  diff: 0 bps  fees: 8 bps  


QA test completed.
```

Here's what the topline metrics for each pair mean:
* **Success rate**: Percentage of succesfully responded RFQs. This should generally be 100%.
* **Avg bias**: Average difference between the reponse RFQ and the expected amount based on price levels and fees. We aim for `0 bps` here but slight differences are fine, especially when testing over a longer time period.
* **Std deviation**: Standard deviation of price difference between all RFQs for this pair. 
* **Min level**: Smallest possible base token amount to request for based on the price levels.
* **Max level**: Largest possible base token amount to request for based on the price levels.

Below the topline metrics, you'll see one line for each RFQ, with the following data:
* **Internal RFQ-ID**: This will match the RFQ-ID that you will be sent as a maker.
* **[P/M] Base**: Base token amount that was either provided in the RFQ (`[P]`) or received from the maker (`[M]`). We'll randomly provide either base token amount or quote token amount in the RFQ. The amount we pick for base token amount is a random value in between `[min level, max level]`.
* **[P/M] Quote**: Quote token amount that was either provided in the RFQ (`[P]`) or received from the maker (`[M]`). We'll randomly provide either base token amount or quote token amount in the RFQ. The amount we pick for quote token amount is a random value in between the expected exchange amounts for `[min level, max level]`.
* **Expected**: The expected amount based on levels queried in parallel to the RFQ. This will be either in the unit of base token or quote token, depending on which one was provided in the RFQ. It also includes the requested fees.
* **Diff**: Basis point deviation between the received and expected amounts.
* **Fees**: Basis point fees that were requested as part of the RFQ. We pick a random number between 0 and 10 to ensure that makers respect the fees field in their RFQs.
