//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { flushObservability, initBladeRunnerObservability } from './observability/observability';
import { runPlan, type TestPlan, runReplicant, type GlobalOptions, type RunParams } from './plan';
import {
  EmptyTestPlan,
  StorageTestPlan,
  TransportTestPlan,
  SignalTestPlan,
  QueryTestPlan,
  ReplicationTestPlan,
} from './spec';
import { readYAMLSpecFile } from './util';

const plans: { [key: string]: () => TestPlan<any, any> } = {
  signal: () => new SignalTestPlan(),
  transport: () => new TransportTestPlan(),
  query: () => new QueryTestPlan(),
  replication: () => new ReplicationTestPlan(),
  storage: () => new StorageTestPlan(),
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
  if (process.env.DX_RUN_PARAMS) {
    const params: RunParams = JSON.parse(process.env.DX_RUN_PARAMS!);
    await runReplicant(params);
    return;
  }

  // Entry point for Replicant browser process.
  if ((globalThis as any).DX_RUN_PARAMS) {
    log.info('running in browser');
    const params = (globalThis as any).DX_RUN_PARAMS;
    invariant(params, 'missing DX_RUN_PARAMS');
    await runReplicant(JSON.parse(params));
    return;
  }

  const argv = yargs(hideBin(process.argv))
    .options({
      // Spec param is used by CI job.
      spec: { type: 'string', describe: 'JSON spec for a test' },
      specfile: { type: 'string', describe: 'read this YAML file for the test spec', default: undefined },
      repeatAnalysis: {
        type: 'string',
        alias: 'r',
        describe: 'skip the test, just process the output JSON file from a prior run',
      },
      profile: { type: 'boolean', default: false, describe: 'run the node profile for agents' },
      headless: { type: 'boolean', default: true, describe: 'run browser agents in headless browsers' },
      observability: { type: 'boolean', default: false, describe: 'enable observability' },
    })
    .demandCommand(1, `need to provide name of test to run\navailable tests: ${Object.keys(plans).join(', ')}`)
    .help().argv;

  if (argv.observability) {
    log.info('observability enabled');
    await initBladeRunnerObservability();
  }

  const name = argv._[0] as string;

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

  let spec: any;
  const plan = planGenerator();
  if (argv.spec) {
    log.info(`using spec: ${argv.spec}`);
    spec = JSON.parse(argv.spec);
  } else if (argv.specfile) {
    log.info(`using spec file: ${argv.specfile}`);
    spec = await readYAMLSpecFile(argv.specfile);
  } else {
    spec = planGenerator().defaultSpec();
  }

  log.info(`\nrunning test: ${name}`, { options });
  await runPlan({ plan, spec, options });
  if (argv.observability) {
    await flushObservability();
  }
};

void start();
