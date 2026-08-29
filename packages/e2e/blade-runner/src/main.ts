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

/**
 * Plans by name, each importing its own spec module on demand.
 *
 * A static barrel import would load every plan's dependencies to run any one of them, and
 * `edge-sync` transitively pulls the function bundler (parsimmon), which fails to load as ESM.
 */
const plans: { [key: string]: () => Promise<TestPlan<any, any>> } = {
  edgeStress: async () => new (await import('./spec/edge-stress')).EdgeStress(),
  edgeSync: async () => new (await import('./spec/edge-sync')).EdgeSync(),
  edgeWs: async () => new (await import('./spec/edge-ws')).EdgeWs(),
  automerge: async () => new (await import('./spec/automerge')).AutomergeTestPlan(),
  // signal: async () => new (await import('./spec/signal')).SignalTestPlan(),
  transport: async () => new (await import('./spec/transport')).TransportTestPlan(),
  query: async () => new (await import('./spec/query')).QueryTestPlan(),
  replication: async () => new (await import('./spec/replication')).ReplicationTestPlan(),
  storage: async () => new (await import('./spec/storage')).StorageTestPlan(),
  empty: async () => new (await import('./spec/empty')).EmptyTestPlan(),
};

/**
 * Replicant modules keyed by the class name the orchestrator sends in `replicantClass`; importing
 * one registers that class with `ReplicantRegistry` as a side effect.
 */
const replicantModules: { [key: string]: () => Promise<unknown> } = {
  AutomergeReplicant: () => import('./replicants/automerge-replicant'),
  ClientReplicant: () => import('./replicants/client-replicant'),
  DumbReplicant: () => import('./replicants/dumb-replicant'),
  EchoReplicant: () => import('./replicants/echo-replicant'),
  EdgeReplicant: () => import('./replicants/edge-replicant'),
  SignalReplicant: () => import('./replicants/signal-replicant'),
  StorageReplicant: () => import('./replicants/storage-replicant'),
  TransportReplicant: () => import('./replicants/transport-replicant'),
  WsReplicant: () => import('./replicants/ws-replicant'),
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
    await startReplicant(JSON.parse(process.env.DX_RUN_PARAMS));
    return;
  }

  // Entry point for Replicant browser process.
  if ((globalThis as any).DX_RUN_PARAMS) {
    log.info('running in browser');
    const params = (globalThis as any).DX_RUN_PARAMS;
    invariant(params, 'missing DX_RUN_PARAMS');
    await startReplicant(JSON.parse(params));
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
      seed: { type: 'string', describe: 'random seed; fixes the generated command sequence' },
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
    randomSeed: argv.seed ?? PublicKey.random().toHex(),
    repeatAnalysis: argv.repeatAnalysis,
    profile: argv.profile,
    headless: argv.headless,
    shouldBuildBrowser: argv.browser,
  };

  if (options.repeatAnalysis) {
    log.info(`\nrepeat analysis from file: ${options.repeatAnalysis}`);
  }

  const testPlan = await planGenerator();
  if (argv.specfile) {
    log.info(`using spec file: ${argv.specfile}`);
    plan = await readYAMLSpecFile(argv.specfile, testPlan, options);
  } else {
    plan = () => ({
      plan: testPlan,
      spec: testPlan.defaultSpec(),
      options,
    });
  }

  log.info(`\nrunning test: ${name}`, { options });
  await runPlan(plan());
};

/**
 * The child process re-runs this file, so it must register its own replicant class before the
 * registry is queried; it needs only that one, which is what keeps the map lazy.
 */
const startReplicant = async (params: RunProps) => {
  const loadModule = replicantModules[params.replicantProps.replicantClass];
  invariant(loadModule, `unknown replicant class: ${params.replicantProps.replicantClass}`);
  await loadModule();
  await runReplicant(params);
};

void start();
