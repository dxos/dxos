// Every workflow that calls `.github/actions/setup` must either bind the remote-cache credentials
// or opt out explicitly. A workflow that does neither used to run with no remote cache, silently
// and green — `model-fixture.yml` did exactly that when it landed after the call sites were wired.
// The setup action now fails such a job, but failing in CI is a slower way to learn it than this.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = '.github/workflows';
const offenders = [];

for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))) {
  const source = readFileSync(join(dir, file), 'utf8');
  if (!source.includes('uses: ./.github/actions/setup')) continue;
  const binds = source.includes('MOON_CACHE_CA_PEM');
  const optsOut = source.includes("remote-cache: 'false'");
  if (!binds && !optsOut) offenders.push(file);
}

if (offenders.length) {
  console.error('Workflows calling ./.github/actions/setup without remote-cache wiring:\n');
  for (const file of offenders) console.error(`  ${dir}/${file}`);
  console.error(`
Add either a workflow-level env block:

env:
  MOON_CACHE_CA_PEM: \${{ secrets.MOON_CACHE_CA_PEM }}
  MOON_CACHE_CLIENT_PEM: \${{ secrets.MOON_CACHE_CLIENT_PEM }}
  MOON_CACHE_CLIENT_KEY: \${{ secrets.MOON_CACHE_CLIENT_KEY }}

or, for a release workflow that should build from source, \`remote-cache: 'false'\` on the setup
call. See tools/moon-cache/README.md.`);
  process.exit(1);
}

console.log('All workflows using the setup action wire the remote cache.');
