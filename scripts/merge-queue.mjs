#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// The merge queue's settings live in the `main` ruleset, not in the repo, so this script is their
// source of truth: it reads the ruleset that carries the `merge_queue` rule, shows the change, and
// writes it back only with `--apply`. Every other rule in that ruleset is sent back unchanged, because
// a ruleset update replaces the whole `rules` list.
//
// Batching is the point. With HEADGREEN grouping a group merges as soon as its last entry's merge
// group passes, and that one Check run already tested every PR ahead of it on the same tree; ALLGREEN
// makes each entry wait for its own run as well.
import { execFileSync } from 'node:child_process';

const USAGE = `Show or apply the merge queue settings for dxos/dxos main.
Usage: node scripts/merge-queue.mjs [--apply] [--help]
  --apply   Write the settings below to the ruleset. Without it the script only prints the diff.
Needs a gh token with admin access to the repository (or the organization, for an org ruleset).`;

const REPO = 'dxos/dxos';
const BRANCH = 'main';

/** Desired `merge_queue` rule parameters; anything not named here keeps its current value. */
const SETTINGS = {
  // Up to five PRs share one merge group, so a busy queue pays one Check run per batch.
  max_entries_to_merge: 5,
  // A lone PR still merges without waiting for company.
  min_entries_to_merge: 1,
  min_entries_to_merge_wait_minutes: 0,
  // Merge a batch when its head passes; the head's run covered every entry in it.
  grouping_strategy: 'HEADGREEN',
  // Groups keep building speculatively in parallel, each on top of the one ahead.
  max_entries_to_build: 5,
};

const gh = (...args) => execFileSync('gh', ['api', ...args], { encoding: 'utf8' });

const main = () => {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    console.log(USAGE);
    return;
  }
  const apply = argv.includes('--apply');

  // `rules/branches/<branch>` lists the rules in force with the ruleset each came from, which finds
  // the ruleset whether it is defined on the repository or inherited from the organization.
  const active = JSON.parse(gh(`repos/${REPO}/rules/branches/${BRANCH}`));
  const queueRule = active.find((rule) => rule.type === 'merge_queue');
  if (!queueRule) {
    fail(
      `No merge_queue rule is in force on ${BRANCH}. An empty answer also means the token cannot read rulesets; it needs admin access.`,
    );
  }
  const endpoint =
    queueRule.ruleset_source_type === 'Organization'
      ? `orgs/${queueRule.ruleset_source}/rulesets/${queueRule.ruleset_id}`
      : `repos/${REPO}/rulesets/${queueRule.ruleset_id}`;
  const ruleset = JSON.parse(gh(endpoint));

  const current = ruleset.rules.find((rule) => rule.type === 'merge_queue').parameters;
  const next = { ...current, ...SETTINGS };
  const changed = Object.keys(SETTINGS).filter((key) => current[key] !== next[key]);

  console.log(`Ruleset "${ruleset.name}" (${endpoint})`);
  for (const key of Object.keys(next)) {
    const marker = changed.includes(key) ? '*' : ' ';
    const value = changed.includes(key) ? `${current[key]} -> ${next[key]}` : `${current[key]}`;
    console.log(`  ${marker} ${key}: ${value}`);
  }
  if (changed.length === 0) {
    console.log('Already up to date.');
    return;
  }
  if (!apply) {
    console.log('Dry run. Re-run with --apply to write the starred settings.');
    return;
  }

  const rules = ruleset.rules.map((rule) =>
    rule.type === 'merge_queue'
      ? { type: rule.type, parameters: next }
      : { type: rule.type, parameters: rule.parameters },
  );
  execFileSync('gh', ['api', '--method', 'PUT', endpoint, '--input', '-'], {
    input: JSON.stringify({ rules }),
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  console.log(`Applied ${changed.length} setting(s).`);
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

main();
