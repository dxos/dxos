//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import {
  runPlan,
  type RunPlanParams,
  readYAMLSpecFile,
  type TestPlan,
  runAgentForPlan,
  type PlanOptions,
} from './plan';
import {
  ReplicationTestPlan,
  EmptyTestPlan,
  SignalTestPlan,
  TransportTestPlan,
  EchoTestPlan,
  AutomergeTestPlan,
  StorageTestPlan,
} from './spec';

// eslint-disable-next-line unused-imports/no-unused-vars
const DXOS_REPO = process.env.DXOS_REPO;

const plans: { [key: string]: () => TestPlan<any, any> } = {
  signal: () => new SignalTestPlan(),
  transport: () => new TransportTestPlan(),
  echo: () => new EchoTestPlan(),
  replication: () => new ReplicationTestPlan(),
  automerge: () => new AutomergeTestPlan(),
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
  // Run agent entry point in node process.
  if (process.env.GRAVITY_SPEC) {
    const name = process.env.GRAVITY_SPEC;
    await runAgentForPlan(name, process.env.GRAVITY_AGENT_PARAMS!, plans[name]());
    return;
  }

  // Run agent entry point in browser.
  if ((globalThis as any).dxgravity_env) {
    log.info('running in browser');
    const name = (globalThis as any).dxgravity_env.GRAVITY_SPEC;
    const params = (globalThis as any).dxgravity_env.GRAVITY_AGENT_PARAMS;
    invariant(name, 'missing GRAVITY_SPEC');
    invariant(params, 'missing GRAVITY_AGENT_PARAMS');
    await runAgentForPlan(name, params, plans[name]());
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
      staggerAgents: { type: 'number', default: 1000, describe: 'stagger agent start time (ms)' },
      profile: { type: 'boolean', default: false, describe: 'run the node profile for agents' },
      headless: { type: 'boolean', default: true, describe: 'run browser agents in headless browsers' },
    })
    .demandCommand(1, `need to provide name of test to run\navailable tests: ${Object.keys(plans).join(', ')}`)
    .help().argv;

  const name = argv._[0] as string;

  let plan: () => RunPlanParams<any, any>;
  const planGenerator = plans[name];

  if (!planGenerator) {
    log.warn(`\nno test: ${name}`);
    log.warn(`\navailable tests: ${Object.keys(plans).join(', ')}`);
    return;
  }

  const options: PlanOptions = {
    staggerAgents: argv.staggerAgents,
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

  await runPlan(name, plan());
};

void start();
