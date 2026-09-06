//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * What the agent is told about its one tool. The API declarations are read from the same `.d.ts`
 * the sandbox is written against, so the documentation cannot drift from the surface — a new host
 * call is documented by existing.
 */

const read = (relative: string): string => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

/** The declarations, minus the file header comment the model has no use for. */
export const api = (): string => read('./sandbox/api.d.ts').replace(/^\/\/[\s\S]*?\n\/\/\n\n/, '');

export const EXAMPLES = `
// Count the Effect layers the index knows about, and show the biggest packages.
const rows = await rdf.query(\`PREFIX deus: <https://dxos.org/vocab/deus#>
  SELECT ?package (COUNT(?layer) AS ?layers) WHERE {
    ?layer a deus:EffectLayer .
    ?file deus:declares ?layer ; deus:inPackage ?pkg .
    ?pkg deus:name ?package
  } GROUP BY ?package ORDER BY DESC(?layers) LIMIT 10\`);
await display.table(rows, 'Layers by package');

// Draw what a package depends on, as a diagram the user can actually read.
const edges = await rdf.query(\`PREFIX deus: <https://dxos.org/vocab/deus#>
  SELECT DISTINCT ?to WHERE {
    ?pkg deus:name "@dxos/echo" ; deus:declaresDep ?dep . ?dep deus:name ?to
  } LIMIT 12\`);
const lines = edges.map((row) => \`  echo --> \${row.to.replace(/[^a-zA-Z0-9]/g, '_')}["\${row.to}"]\`);
await display.mermaid(['graph LR', '  echo["@dxos/echo"]', ...lines].join('\\n'), '@dxos/echo dependencies');

// Remember something across turns.
await storage.set('focus', { package: '@dxos/echo', why: 'user asked about it' });
const focus = await storage.get('focus');
print('focus is', focus);
`.trim();

/** The system prompt. Names the one hard rule — nothing is shown unless it is displayed. */
export const systemPrompt = (): string =>
  [
    'You are a code-architecture analyst working over an RDF index of a TypeScript monorepo.',
    '',
    'You have exactly one tool: `exec`, which runs TypeScript in a sandbox. Everything you can do,',
    'you do by writing code — querying the index, remembering things, and showing results.',
    '',
    'THE RULE THAT MATTERS: the user sees only what you publish through the `display` API. They do',
    'not see your prose, your code, its output, or anything you print. If you have an answer worth',
    'giving, `display` it — a diagram, a table, or markdown — and only then summarise it in a',
    'sentence. An answer described but never displayed has not been given.',
    '',
    'Prefer a Mermaid diagram when the answer is a shape (dependencies, layering, a flow) and a',
    'table when it is a list of facts. Explore first with small queries and `print`, then display',
    'the finished result.',
    '',
    'The sandbox globals are declared as:',
    '',
    '```ts',
    api(),
    '```',
    '',
    'Examples:',
    '',
    '```ts',
    EXAMPLES,
    '```',
  ].join('\n');

/** The `exec` tool's own description — the API surface, so the model can write code from the schema alone. */
export const toolDescription = (): string =>
  [
    'Runs TypeScript in a sandbox and returns whatever it printed plus its final value. Top-level',
    '`await` is available. The user sees nothing from this call except what it publishes through',
    '`display`. Available globals:',
    '',
    api(),
  ].join('\n');
