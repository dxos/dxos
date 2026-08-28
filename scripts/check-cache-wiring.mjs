// Every job that calls the setup action must either see all three remote-cache credentials or opt out
// at that call site. A job that does neither used to run with no remote cache, silently and green —
// `model-fixture.yml` did exactly that when it landed after the call sites were wired. The setup action
// fails such a job, but failing in CI is a slower way to learn it than this.
//
// Scoped per job rather than per file: env can be set at workflow or job level, and one job opting
// out must not excuse another job in the same file that did not.
//
// Both workflow directories and both action paths, because the check is worth exactly what it covers:
// after the Depot CI migration every call site said `./.depot/actions/setup` and every moon-running
// workflow lived in `.depot/workflows`, so a checker that knew only the `.github` spellings passed by
// matching nothing at all — the same silent-green failure it exists to prevent.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const DIRS = ['.github/workflows', '.depot/workflows'];
const SETUP = ['./.github/actions/setup', './.depot/actions/setup'];
const REQUIRED = ['MOON_CACHE_CA_PEM', 'MOON_CACHE_CLIENT_PEM', 'MOON_CACHE_CLIENT_KEY'];
const problems = [];
let callSites = 0;

/**
 * Flatten Depot CI `parallel:`/`sequential:` groups, whose members are steps in their own right.
 */
const flatten = (steps) =>
  (steps ?? []).flatMap((step) =>
    step?.parallel || step?.sequential ? flatten(step.parallel ?? step.sequential) : [step],
  );

for (const dir of DIRS.filter((candidate) => existsSync(candidate))) {
  for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))) {
    const workflow = parse(readFileSync(join(dir, file), 'utf8'));
    for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
      for (const step of flatten(job?.steps)) {
        if (!SETUP.includes(step?.uses)) continue;
        callSites++;

        // `remote-cache` is per call site, so an opt-out elsewhere cannot cover this one.
        if (String(step.with?.['remote-cache']) === 'false') continue;

        const visible = { ...(workflow.env ?? {}), ...(job.env ?? {}), ...(step.env ?? {}) };
        const missing = REQUIRED.filter((name) => !(name in visible));
        if (missing.length) {
          problems.push({ file: join(dir, file), job: jobName, missing });
        }
      }
    }
  }
}

// A checker that matches nothing reports the same green as a correctly wired repo, which is how the
// `.github`-only spellings survived the migration unnoticed.
if (callSites === 0) {
  console.error(`No setup call sites found in ${DIRS.join(', ')} — this check is matching nothing.`);
  console.error(`Looked for a step with \`uses\` of: ${SETUP.join(' or ')}.`);
  process.exit(1);
}

if (problems.length) {
  console.error('Jobs calling the setup action without remote-cache wiring:\n');
  for (const { file, job, missing } of problems) {
    console.error(`  ${file}  job "${job}"  missing: ${missing.join(', ')}`);
  }
  console.error(`
Add a workflow-level env block:

env:
  MOON_CACHE_CA_PEM: \${{ secrets.MOON_CACHE_CA_PEM }}
  MOON_CACHE_CLIENT_PEM: \${{ secrets.MOON_CACHE_CLIENT_PEM }}
  MOON_CACHE_CLIENT_KEY: \${{ secrets.MOON_CACHE_CLIENT_KEY }}

or, for a release workflow that should build from source, \`remote-cache: 'false'\` on that setup
call. See tools/moon-cache/README.md.`);
  process.exit(1);
}

console.log(`All ${callSites} setup call sites wire the remote cache.`);
