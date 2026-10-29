//
// Copyright 2026 DXOS.org
//

// Fails when a `## Changelog` decision records how the work was done rather than a choice about the specified
// system (packages/reflect/deus/lang/changelog.mdl, rule 9). The judgement is semantic, so TypeSafe System One makes it, one question per
// decision. Usage:
//   node .agents/skills/mdl/scripts/check-decisions.ts                  new decisions in .mdl files changed since
//                                                                         the merge base of MDL_BASE_REF (origin/main)
//   node .agents/skills/mdl/scripts/check-decisions.ts <file.mdl>...    every decision in the named files
// Needs TYPESAFE_API_KEY; without it the check reports that it was skipped and passes.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { type ChangelogEntry, parseChangelog } from '../../../../packages/reflect/deus/src/extension/check.ts';
import { type Question, errorMessage, makeClient } from '../../agentic-review/lib/system-one/client.ts';

/** A decision at or above this probability of being process is reported. */
const DEFAULT_THRESHOLD = 0.8;

// Same exemptions as `deus changelog check`: language definitions, review rules and test fixtures are not specs.
const EXEMPT = [/^packages\/reflect\/deus\/lang\//, /\/__fixtures__\//, /(^|\/)rules\//];

/** The question System One answers for each decision; `true` means the decision does not belong in a spec. */
export const PROCESS_QUESTION: Question = {
  type: 'noul',
  instructions:
    "The state is one decision from the changelog of a specification, with the spec's name and introduction, which " +
    'say what system it specifies. That system may itself be a tool, a language or a workflow. A changelog records ' +
    'choices about that system. Decide whether this decision is instead about how the people and agents writing ' +
    'this spec, or the code it describes, did or deliver their own work.',
  criteria: {
    true:
      "Process: it is about the authors' own work on this spec or its code, not about the specified system. For " +
      'example: which tool or skill the authors use; how or where this document is shared, published, reviewed or ' +
      'presented; which PR, branch or repository a change goes in; continuing earlier work; that this document ' +
      "should exist, have diagrams, or be reorganized; the order of the authors' tasks.",
    false:
      'Spec: it fixes something about the specified system as the introduction defines it: behavior, requirements, ' +
      'limits, interfaces, data, structure, tests or QA flows of that system, dependencies, failure handling, or the ' +
      'reason for one of those. When the system is itself a process or tool (a spec language, a review harness, a ' +
      'workflow), decisions about how that process works are spec decisions. Approving or superseding earlier spec ' +
      'decisions is a spec decision.',
  },
};

const {
  values: { threshold: thresholdArg },
  positionals: files,
} = parseArgs({ options: { threshold: { type: 'string' } }, allowPositionals: true });
const threshold = thresholdArg === undefined ? DEFAULT_THRESHOLD : Number(thresholdArg);

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim();
const lines = (text: string): string[] => text.split('\n').filter(Boolean);

/** The decisions to judge: every decision of the named files, or those a branch added to its changed specs. */
type Subject = { name?: string; intro: string };

/** What a spec specifies: its front-matter name and the prose before its first heading. */
const subjectOf = (text: string): Subject => {
  const name = /^name:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const intro = body
    .split(/^#{1,6} /m)[0]
    .trim()
    .slice(0, 1_500);
  return { ...(name ? { name } : {}), intro };
};

const collect = (): { path: string; subject: Subject; entry: ChangelogEntry }[] => {
  if (files.length > 0) {
    return files.flatMap((path) => {
      const text = readFileSync(path, 'utf8');
      const subject = subjectOf(text);
      return parseChangelog(text).entries.map((entry) => ({ path, subject, entry }));
    });
  }
  const baseRef = process.env.MDL_BASE_REF || 'origin/main';
  let base: string;
  try {
    base = git('merge-base', baseRef, 'HEAD');
  } catch {
    base = baseRef;
  }
  const changed = new Map<string, string | undefined>();
  for (const line of lines(git('diff', '--name-status', '-M', '--diff-filter=AMR', base, '--', '*.mdl'))) {
    const [status, ...paths] = line.split('\t');
    changed.set(paths[paths.length - 1], status === 'A' ? undefined : paths[0]);
  }
  for (const path of lines(git('ls-files', '--others', '--exclude-standard', '--', '*.mdl'))) {
    changed.set(path, undefined);
  }
  return [...changed]
    .filter(([path]) => !EXEMPT.some((pattern) => pattern.test(path)))
    .flatMap(([path, basePath]) => {
      const before =
        basePath === undefined
          ? new Set<string>()
          : new Set(parseChangelog(git('show', `${base}:${basePath}`)).entries.map(({ id }) => id));
      const text = readFileSync(path, 'utf8');
      const subject = subjectOf(text);
      return parseChangelog(text)
        .entries.filter(({ id }) => !before.has(id))
        .map((entry) => ({ path, subject, entry }));
    });
};

const event = process.env.GITHUB_EVENT_NAME;
if (files.length === 0 && event && event !== 'pull_request') {
  console.log(`Skipping on \`${event}\` - the decision check is diff-based.`);
  process.exit(0);
}

const decisions = collect();
if (decisions.length === 0) {
  console.log('OK: no new decisions to check.');
  process.exit(0);
}
if (!process.env.TYPESAFE_API_KEY) {
  console.log(`Skipped: ${decisions.length} decision(s) not checked, TYPESAFE_API_KEY is not set.`);
  process.exit(0);
}

const client = makeClient({ apiKey: process.env.TYPESAFE_API_KEY });
let failures = 0;
await Promise.all(
  decisions.map(async ({ path, subject, entry }) => {
    const state = {
      spec: subject,
      decision: `${entry.id}: ${entry.title}`,
      ...(entry.why ? { why: entry.why } : {}),
      ...(entry.affects.length > 0 ? { affects: entry.affects } : {}),
    };
    try {
      const { answers } = await client.evaluate(state, { process: PROCESS_QUESTION });
      const answer = answers.process;
      if (answer?.type !== 'noul') {
        throw new Error('System One returned no process classification');
      }
      const probability = answer.noul;
      if (probability >= threshold) {
        failures++;
        console.log(
          `${path}: ${entry.id} records process, not a spec decision (p=${probability.toFixed(2)}): ${entry.title}`,
        );
      } else if (files.length > 0) {
        console.log(`${path}: ${entry.id} ok (p=${probability.toFixed(2)})`);
      }
    } catch (error) {
      failures++;
      console.log(`${path}: ${entry.id} could not be checked: ${errorMessage(error)}`);
    }
  }),
);

if (failures > 0) {
  console.log(
    `\n${failures} decision(s) failed. A changelog records choices about the specified system; leave process out ` +
      '(packages/reflect/deus/lang/changelog.mdl rule 9, .agents/skills/mdl/SKILL.md).',
  );
  process.exit(1);
}
console.log(`OK: ${decisions.length} decision(s) are spec decisions.`);
