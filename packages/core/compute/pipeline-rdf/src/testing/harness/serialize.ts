//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Fact } from '@dxos/echo-memory';

const HEADER = `//
// Copyright 2026 DXOS.org
//

import { Fact } from '@dxos/echo-memory';
`;

/**
 * Emit the TypeScript source of a `DEMO_FACTS` module from extracted facts.
 * Each fact is encoded via its Schema (plain JSON) so the output is a valid
 * array of object literals; `satisfies Fact.Encoded[]` re-typechecks the data
 * against the schema at compile time of the generated module.
 */
export const factsToModule = (facts: readonly Fact.Fact[]): string => {
  const encoded = facts.map((fact) => Schema.encodeSync(Fact.Fact)(fact));
  const literal = JSON.stringify(encoded, null, 2);
  return `${HEADER}\nexport const DEMO_FACTS = ${literal} satisfies Fact.Encoded[];\n`;
};
