#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

import { parseArgs } from 'node:util';

import { capture } from './capture.ts';
import { compare } from './compare.ts';
import { doctor } from './doctor.ts';
import { freeze, thaw } from './freeze.ts';
import { gate } from './gate.ts';
import { readLedger } from './ledger.ts';
import { runCommand } from './run.ts';
import { scenarioCheck, scenarioNew } from './scenario.ts';
import { installInterruptHandlers } from './session.ts';
import { expand, summarize } from './summarize.ts';
import { HarnessError, errorCode, workspaceRoot } from './workspace.ts';

const HELP = `perf: build, serve and measure the app, and say whether a change helped.

usage: pnpm perf <command> [options]

  doctor                  ports, load, lock and tree; exit 4 if a measurement would fail or mislead
  run [-n 3]              measure the working tree: stage table, score against the CI budgets
  compare --base <ref>    paired A/B of HEAD against <ref>; the verdict is the exit code
  summarize [<run>]       where the CPU went: top functions by self time, or by the change in
                          self time between a compare's arms; source-mapped, one handle per row
  expand <handle>         a summary row's callers and callees
  capture --attach <port> profile every realm of an app someone is running (dev, preview, Electron
                          with a debugging port) for --seconds 20, and print the summary
  scenario new <name> --reproduces <text>
                          scaffold a scenario spec that reproduces a field report
  scenario check <name> [--capture <run>] [--inject <stage>:<ms>] [--rounds 6]
                          before registering: A/A stability, injected-slowdown sensitivity, and
                          overlap with the capture's hot functions
  gate                    the boot-graph budget CI gates every PR on
  ledger [-n 10]          this worktree's past measurements (.perf/ledger.tsv)
  freeze / thaw           pin the harness for an optimization loop: edits to it are refused,
                          budgets cannot be rewritten, and compare voids a verdict after it moved

compare
  --metric <pattern>      metric ids the verdict rests on; repeatable, * matches anything:
                          'wall > boot', 'reactRenders > *', 'run > peak app footprint'.
                          Default: the work counters the nightly budgets (steady run to run).
                          Targets share one 5% false-call budget, so each extra one needs more rounds
  --threshold <percent>   smallest change that counts (default: work 5%, stage times 10%, run 5%)
  --min-rounds 6 --max-rounds 12 --max-minutes 60
  --base HEAD             A/A: both arms are the same tree, which shows this machine's noise
  --check <command>       must pass before anything is measured; repeatable, e.g.
                          --check 'moon run composer-app:test'
  --allow-harness-change  measure even though the harness differs between the arms (otherwise void)
  --json                  one JSON line instead of the table

summarize
  --stage <stage>  --realm <text>  --top 30
  --heap                  the memory snapshots of a \`run --snapshots\` instead of the CPU profiles

run
  --snapshots <list>      heap snapshots at idle, a stage id, or end (comma-separated); every
                          stage after one is perturbed, so the run compares with nothing else

common: --target composer  --scenario <name> (run, compare: measure a scenario instead of the flow)
         --ignore-load  --lock-wait <minutes, default 60>

compare exits 0 improved, 1 regressed, 2 no change, 3 inconclusive, 4 could not measure.
HEAD must be committed: each attempt is a commit, so the ledger can name what was measured.
`;

const integer = (value: string | undefined, fallback: number, name: string): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HarnessError(`--${name} takes a non-negative number, not "${value}"`);
  }
  return parsed;
};

const main = async (): Promise<number> => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      'target': { type: 'string', default: 'composer' },
      'scenario': { type: 'string' },
      'attach': { type: 'string' },
      'seconds': { type: 'string' },
      'dist': { type: 'string' },
      'reproduces': { type: 'string' },
      'inject': { type: 'string' },
      'capture': { type: 'string' },
      'rounds': { type: 'string' },
      'base': { type: 'string' },
      'metric': { type: 'string', multiple: true },
      'check': { type: 'string', multiple: true },
      'allow-harness-change': { type: 'boolean', default: false },
      'threshold': { type: 'string' },
      'min-rounds': { type: 'string' },
      'max-rounds': { type: 'string' },
      'max-minutes': { type: 'string' },
      'iterations': { type: 'string', short: 'n' },
      'stage': { type: 'string' },
      'realm': { type: 'string' },
      'top': { type: 'string' },
      'run': { type: 'string' },
      'heap': { type: 'boolean', default: false },
      'snapshots': { type: 'string' },
      'json': { type: 'boolean', default: false },
      'ignore-load': { type: 'boolean', default: false },
      'lock-wait': { type: 'string' },
      'seed': { type: 'string' },
      'help': { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command] = positionals;
  const common = {
    target: values.target,
    scenario: values.scenario,
    ignoreLoad: values['ignore-load'],
    lockWaitMinutes: integer(values['lock-wait'], 60, 'lock-wait'),
  };

  if (values.help || !command || command === 'help') {
    process.stdout.write(HELP);
    return 0;
  }
  switch (command) {
    case 'doctor':
      return doctor({ target: values.target });
    case 'run':
      return runCommand({
        ...common,
        iterations: Math.max(1, Math.round(integer(values.iterations, 3, 'iterations'))),
        snapshots: values.snapshots,
      });
    case 'compare': {
      if (!values.base) {
        throw new HarnessError('compare needs --base <ref> (HEAD for an A/A run)');
      }
      const threshold = values.threshold === undefined ? undefined : integer(values.threshold, 0, 'threshold') / 100;
      return compare({
        ...common,
        base: values.base,
        metrics: values.metric ?? [],
        threshold,
        minRounds: integer(values['min-rounds'], 6, 'min-rounds'),
        maxRounds: integer(values['max-rounds'], 12, 'max-rounds'),
        maxMinutes: integer(values['max-minutes'], 60, 'max-minutes'),
        seed: integer(values.seed, 1, 'seed'),
        json: values.json,
        checks: values.check ?? [],
        allowHarnessChange: values['allow-harness-change'],
      });
    }
    case 'summarize':
      return summarize({
        run: positionals[1] ?? values.run,
        stage: values.stage,
        realm: values.realm,
        top: Math.max(1, Math.round(integer(values.top, 30, 'top'))),
        heap: values.heap,
      });
    case 'expand': {
      const handle = positionals[1];
      if (!handle) {
        throw new HarnessError('expand needs a handle from `pnpm perf summarize`, e.g. h3');
      }
      return expand({ handle, run: values.run });
    }
    case 'capture': {
      if (!values.attach) {
        throw new HarnessError(
          'capture needs --attach <port>: the remote debugging port of the browser running the app',
        );
      }
      return capture({
        target: values.target,
        attach: integer(values.attach, 0, 'attach'),
        seconds: integer(values.seconds, 20, 'seconds'),
        dist: values.dist,
        top: Math.max(1, Math.round(integer(values.top, 30, 'top'))),
      });
    }
    case 'scenario': {
      const [, verb, name] = positionals;
      if (!name || (verb !== 'new' && verb !== 'check')) {
        throw new HarnessError('usage: pnpm perf scenario new <name> --reproduces <text> | scenario check <name>');
      }
      if (verb === 'new') {
        if (!values.reproduces) {
          throw new HarnessError('scenario new needs --reproduces "<what the field report said, in one line>"');
        }
        return scenarioNew({ target: values.target, scenario: name, reproduces: values.reproduces });
      }
      return scenarioCheck({
        target: values.target,
        scenario: name,
        capture: values.capture,
        inject: values.inject,
        rounds: Math.max(3, Math.round(integer(values.rounds, 6, 'rounds'))),
        seed: integer(values.seed, 1, 'seed'),
        ignoreLoad: values['ignore-load'],
        lockWaitMinutes: integer(values['lock-wait'], 60, 'lock-wait'),
      });
    }
    case 'gate':
      return gate({ target: values.target });
    case 'freeze':
      return freeze({ target: values.target });
    case 'thaw':
      return thaw();
    case 'ledger': {
      const rows = readLedger(workspaceRoot()).slice(-Math.max(1, integer(values.iterations, 10, 'n')));
      process.stdout.write(
        rows
          .map(
            ({ time, command: ran, head, verdict, summary, dir }) =>
              `${time.slice(0, 16)}  ${ran.padEnd(14)} ${head.padEnd(18)} ${verdict.padEnd(13)} ${summary}  ${dir}`,
          )
          .join('\n') + (rows.length > 0 ? '\n' : 'no measurements yet\n'),
      );
      return 0;
    }
    default:
      throw new HarnessError(`unknown command "${command}"; pnpm perf help lists them`);
  }
};

installInterruptHandlers();
main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const usage = error instanceof HarnessError || errorCode(error)?.startsWith('ERR_PARSE_ARGS');
    process.stderr.write(
      error instanceof Error
        ? `perf: ${usage ? error.message : (error.stack ?? error.message)}\n`
        : `perf: ${String(error)}\n`,
    );
    process.exit(4);
  },
);
