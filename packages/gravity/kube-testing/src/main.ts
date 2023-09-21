//
// Copyright 2023 DXOS.org
//

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { PublicKey } from '@dxos/keys';

import { runPlan, RunPlanParams, readYAMLSpecFile, TestPlan, runAgentForPlan } from './plan';
import { EchoTestPlan, ReplicationTestPlan, SignalTestPlan, TransportTestPlan } from './spec';

// eslint-disable-next-line unused-imports/no-unused-vars
const DXOS_REPO = process.env.DXOS_REPO;

const plans: { [key: string]: () => TestPlan<any, any> } = {
  signal: () => new SignalTestPlan(),
  transport: () => new TransportTestPlan(),
  echo: () => new EchoTestPlan(),
  replication: () => new ReplicationTestPlan(),
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
  if (process.env.GRAVITY_SPEC) {
    const name = process.env.GRAVITY_SPEC;
    await runAgentForPlan(name, process.env.GRAVITY_AGENT_PARAMS!, plans[name]());
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
    })
    .demandCommand(1, `need to provide name of test to run\navailable tests: ${Object.keys(plans).join(', ')}`)
    .help().argv;

  const name = argv._[0] as string;

  let plan: () => RunPlanParams<any, any>;
  const planGenerator = plans[name];

  if (!planGenerator) {
    console.warn(`\nno test: ${name}`);
    console.warn(`\navailable tests: ${Object.keys(plans).join(', ')}`);
    return;
  }

  const options = {
    staggerAgents: argv.staggerAgents,
    randomSeed: PublicKey.random().toHex(),
    repeatAnalysis: argv.repeatAnalysis,
    profile: argv.profile,
  };

  if (options.repeatAnalysis) {
    console.info(`\nrepeat analysis from file: ${options.repeatAnalysis}`);
  }

  if (argv.specfile) {
    console.info(`\nusing spec file: ${argv.specfile}`);
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
