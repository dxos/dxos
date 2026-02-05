//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  type GlobalOptions,
  type RunPlanProps,
  type RunProps,
  type TestPlan,
  readYAMLSpecFile,
  runPlan,
  runReplicant,
} from './plan';
import {
  AutomergeTestPlan,
  AutomergeTestPlan,
  EdgeSync,
  EdgeWs,
  EmptyTestPlan,
  QueryTestPlan,
  QueryTestPlan,
  ReplicationTestPlan,
  ReplicationTestPlan,
  StorageTestPlan,
  TransportTestPlan,
} from './spec';

const plans: { [key: string]: () => TestPlan<any, any> } = {
  edgeSync: () => new EdgeSync(),
  edgeWs: () => new EdgeWs(),
  automerge: () => new AutomergeTestPlan(),
  // signal: () => new SignalTestPlan(),
  transport: () => new TransportTestPlan(),
  query: () => new QueryTestPlan(),
  replication: () => new ReplicationTestPlan(),
  storage: () => new StorageTestPlan(),
  empty: () => new EmptyTestPlan(),
};

/**
 * Requirements:
 * - Configure Redis (e.g., via Docker desktop) and export port.
 *
 * Example: p run-tests echo
 */
// TODO(mykola): Support edge signaling.
const start = async () => {
  // Entry point for Replicant node process.
  if (process.env.DX_RUN_PARAMS) {
    const params: RunProps = JSON.parse(process.env.DX_RUN_PARAMS!);
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
      specfile: { type: 'string', alias: 's', describe: 'read this YAML file for the test spec' },
      repeatAnalysis: {
        type: 'string',
        alias: 'r',
        describe: 'skip the test, process the output file from a prior run',
      },
      profile: { type: 'boolean', default: false, describe: 'run the node profile for agents' },
      headless: { type: 'boolean', default: true, describe: 'run browser agents in headless browsers' },
      browser: { type: 'boolean', default: true, describe: 'build the browser bundle', alias: 'b' },
    })
    .demandCommand(1, `need to provide name of test to run\navailable tests: ${Object.keys(plans).join(', ')}`)
    .help().argv;

  const name = argv._[0] as string;

  let plan: () => RunPlanProps<any>;
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
    shouldBuildBrowser: argv.browser,
  };

  if (options.repeatAnalysis) {
    log.info(`\nrepeat analysis from file: ${options.repeatAnalysis}`);
  }

  if (argv.specfile) {
    log.info(`using spec file: ${argv.specfile}`);
    plan = await readYAMLSpecFile(argv.specfile, planGenerator(), options);
  } else {
    const testPlan = planGenerator();
    plan = () => ({
      plan: testPlan,
      spec: testPlan.defaultSpec(),
      options,
    });
  }

  log.info(`\nrunning test: ${name}`, { options });
  await runPlan(plan());
};

void start();
