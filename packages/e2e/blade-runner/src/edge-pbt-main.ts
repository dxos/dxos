//
// Copyright 2026 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type GlobalOptions, type RunProps, runPlan, runReplicant } from './plan';
import { EdgePbt } from './spec/edge-pbt';

/**
 * Entry point for the `edgePbt` plan only.
 *
 * Separate from `main.ts` because that one imports every plan barrel, and `edge-sync` transitively
 * pulls in the function bundler (`@dxos/plugin-script/templates` -> parsimmon), which fails to load
 * as ESM. Nothing here needs it. The child replicant process re-runs this same file (blade-runner
 * spawns `process.argv[1]`), so importing `EdgePbt` — and through it `ClientReplicant` — is what
 * registers the replicant class on both sides.
 *
 * Usage:
 *   node --import tsx src/edge-pbt-main.ts --seed <seed> [--specfile spec.json]
 */
const start = async () => {
  if (process.env.DX_RUN_PARAMS) {
    const params: RunProps = JSON.parse(process.env.DX_RUN_PARAMS);
    await runReplicant(params);
    return;
  }

  const argv = await yargs(hideBin(process.argv))
    .options({
      seed: { type: 'string', describe: 'random seed; fixes the generated command sequence' },
      specfile: { type: 'string', alias: 's', describe: 'JSON/YAML file overriding the default spec' },
      profile: { type: 'boolean', default: false, describe: 'run the node profiler for replicants' },
    })
    .help().argv;

  const options: GlobalOptions = {
    randomSeed: argv.seed ?? PublicKey.random().toHex(),
    profile: argv.profile,
    // Node-only plan: never build the browser bundle.
    shouldBuildBrowser: false,
  };

  const plan = new EdgePbt();
  let spec = plan.defaultSpec();
  if (argv.specfile) {
    const { readFile } = await import('node:fs/promises');
    const yaml = await import('js-yaml');
    spec = { ...spec, ...(yaml.load(await readFile(argv.specfile, 'utf8')) as Partial<typeof spec>) };
  }

  log.info('running edgePbt', { seed: options.randomSeed, spec });
  await runPlan({ plan, spec, options });
};

void start();
