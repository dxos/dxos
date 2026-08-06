// Every job that calls `.github/actions/setup` must either see all three remote-cache credentials
// or opt out at that call site. A job that does neither used to run with no remote cache, silently
// and green — `model-fixture.yml` did exactly that when it landed after the call sites were wired.
// The setup action fails such a job, but failing in CI is a slower way to learn it than this.
//
// Scoped per job rather than per file: env can be set at workflow or job level, and one job opting
// out must not excuse another job in the same file that did not.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const dir = '.github/workflows';
const REQUIRED = ['MOON_CACHE_CA_PEM', 'MOON_CACHE_CLIENT_PEM', 'MOON_CACHE_CLIENT_KEY'];
const problems = [];

for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))) {
  const workflow = parse(readFileSync(join(dir, file), 'utf8'));
  for (const [jobName, job] of Object.entries(workflow?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (step?.uses !== './.github/actions/setup') continue;

      // `remote-cache` is per call site, so an opt-out elsewhere cannot cover this one.
      if (String(step.with?.['remote-cache']) === 'false') continue;

      const visible = { ...(workflow.env ?? {}), ...(job.env ?? {}), ...(step.env ?? {}) };
      const missing = REQUIRED.filter((name) => !(name in visible));
      if (missing.length) {
        problems.push({ file, job: jobName, missing });
      }
    }
  }
}

if (problems.length) {
  console.error('Jobs calling ./.github/actions/setup without remote-cache wiring:\n');
  for (const { file, job, missing } of problems) {
    console.error(`  ${dir}/${file}  job "${job}"  missing: ${missing.join(', ')}`);
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

console.log('All jobs using the setup action wire the remote cache.');
