//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { runPlan, type RunPlanParams, readYAMLSpecFile, type TestPlan, runReplicant, type GlobalOptions } from './plan';
import { type RunParams } from './plan/run-process';
import {
  EmptyTestPlan,
  EchoTestPlan,
  // ReplicationTestPlan,
  // SignalTestPlan,
  // TransportTestPlan,
  // AutomergeTestPlan,
  // StorageTestPlan,
} from './spec';

// eslint-disable-next-line unused-imports/no-unused-vars
const DXOS_REPO = process.env.DXOS_REPO;

const plans: { [key: string]: () => TestPlan<any, any> } = {
  // signal: () => new SignalTestPlan(),
  // transport: () => new TransportTestPlan(),
  echo: () => new EchoTestPlan(),
  // replication: () => new ReplicationTestPlan(),
  // automerge: () => new AutomergeTestPlan(),
  // storage: () => new StorageTestPlan(),
  empty: () => new EmptyTestPlan(),
};

/**
 * Requirements:
 * - Configure Redis (e.g., via Docker desktop) and export port.
 * - Install Go version 19.
 * - Set the KUBE_HOME environment variable to the root of the kube repo.
 *
 * Example: KUBE_HOME=~/Code/dxos/kube p run-tests echo
 */
const start = async () => {
  // Entry point for Replicant node process.
  if (process.env.__DX_NODE_REPLICANT) {
    const params: RunParams<any> = JSON.parse(process.env.DX_RUN_PARAMS!);
    await runReplicant(params);
    return;
  }

  // Entry point for Replicant browser process.
  if ((globalThis as any).__DX_BROWSER_REPLICANT) {
    log.info('running in browser');
    const params = (globalThis as any).dx_blade_runner_env.DX_RUN_PARAMS;
    invariant(params, 'missing DX_RUN_PARAMS');
    await runReplicant(JSON.parse(params));
    return;
  }

  const argv = yargs(hideBin(process.argv))
    .options({
      specfile: { type: 'string', alias: 's', describe: 'read this YAML file for the test spec' },
      repeatAnalysis: {
        type: 'string',
        alias: 'r',
        describe: 'skip the test, just process the output JSON file from a prior run',
      },
      profile: { type: 'boolean', default: false, describe: 'run the node profile for agents' },
      headless: { type: 'boolean', default: true, describe: 'run browser agents in headless browsers' },
    })
    .demandCommand(1, `need to provide name of test to run\navailable tests: ${Object.keys(plans).join(', ')}`)
    .help().argv;

  const name = argv._[0] as string;

  let plan: () => RunPlanParams<any>;
  const planGenerator = plans[name];

  if (!planGenerator) {
    log.warn(`\nno test: ${name}`);
    log.warn(`\navailable tests: ${Object.keys(plans).join(', ')}`);
    return;
  }

  const options: GlobalOptions = {
    randomSeed: PublicKey.random().toHex(),
    repeatAnalysis: argv.repeatAnalysis,
    profile: argv.profile,
    headless: argv.headless,
  };

  if (options.repeatAnalysis) {
    log.info(`\nrepeat analysis from file: ${options.repeatAnalysis}`);
  }

  if (argv.specfile) {
    log.info(`using spec file: ${argv.specfile}`);
    plan = await readYAMLSpecFile(argv.specfile, planGenerator(), options);
  } else {
    plan = () => ({
      plan: planGenerator(),
      spec: planGenerator().defaultSpec(),
      options,
    });
  }

  log.info(`\nrunning test: ${name}`, { options });
  await runPlan(plan());
};

void start();
