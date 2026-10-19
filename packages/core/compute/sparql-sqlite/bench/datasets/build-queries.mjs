//
// Copyright 2026 DXOS.org
//

// Writes `<dataset>.queries.json` ([{ id, family, template, sparql, ... }]) for every dataset found in the data
// directory: BSBM from BsbmParams' JSON lines, WatDiv from the generator's instantiated templates, LUBM and
// DBLP from queries.mjs. Usage: node build-queries.mjs <data dir>

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { DBLP, LUBM } from './queries.mjs';

const dir = process.argv[2];
const write = (name, queries) => {
  writeFileSync(join(dir, `${name}.queries.json`), JSON.stringify(queries, null, 1));
  console.error(`${name}: ${queries.length} queries`);
};

const BSBM_KIND = {
  1: 'star+filter',
  2: 'lookup star',
  3: 'negation',
  4: 'union',
  5: 'self-join+filter',
  6: 'regex',
  7: 'optional',
  8: 'optional+lang',
  9: 'describe',
  10: 'join+filter',
  11: 'union lookup',
  12: 'construct',
};
for (const products of [2785, 14000]) {
  const file = join(dir, `bsbm-${products}.queries.jsonl`);
  if (existsSync(file)) {
    const lines = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('{'));
    write(
      `bsbm-${products}`,
      lines
        .map((line) => JSON.parse(line))
        .map(({ q, i, sparql }) => ({
          id: `B-Q${q}${'abc'[i]}`,
          family: 'bsbm',
          template: `B-Q${q}`,
          kind: BSBM_KIND[q],
          sparql,
        })),
    );
  }
}

const WATDIV_PREFIX = 'PREFIX wsdbm: <http://db.uwaterloo.ca/~galuc/wsdbm/>\n';
for (const scale of [10, 50]) {
  const file = join(dir, `watdiv${scale}.queries.txt`);
  if (existsSync(file)) {
    const queries = [];
    for (const block of readFileSync(file, 'utf8').split('#TEMPLATE ').slice(1)) {
      const template = block.slice(0, block.indexOf('\n')).trim();
      const texts = [
        ...new Set(
          block
            .split(/(?=SELECT )/)
            .slice(1)
            .map((text) => text.trim()),
        ),
      ];
      texts.forEach((sparql, index) =>
        queries.push({
          id: `W-${template}${'abc'[index]}`,
          family: 'watdiv',
          template: `W-${template}`,
          kind: { L: 'linear', S: 'star', F: 'snowflake', C: 'complex' }[template[0]],
          sparql: WATDIV_PREFIX + sparql,
        }),
      );
    }
    write(`watdiv${scale}`, queries);
  }
}

if (existsSync(join(dir, 'lubm10.nt'))) {
  write(
    'lubm10',
    LUBM.map((query) => ({ ...query, template: query.id })),
  );
}
if (existsSync(join(dir, 'dblp-6m.nt'))) {
  write(
    'dblp-6m',
    DBLP.map((query) => ({ ...query, template: query.id })),
  );
}
