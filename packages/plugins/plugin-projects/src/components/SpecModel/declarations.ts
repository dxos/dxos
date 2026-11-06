//
// Copyright 2026 DXOS.org
//

import { type Declaration, type Relationship, declarationsOf, dialectTexts, extendsOf } from '@dxos/deus/dialect';

/** Each block type's role and links, by type. */
export type Declarations = ReadonlyMap<string, Declaration>;

/** A link as a definition edge carries it: one read from the other end is turned round to the relationship it inverts. */
export type DefinitionRelation = Exclude<Relationship, 'generalizes' | 'part-of'>;

/** A declared link as an edge relation, and whether it is read from the named block, as `part-of` and `generalizes` are. */
export const relationOf = (relationship: Relationship): { relation: DefinitionRelation; reversed: boolean } =>
  relationship === 'part-of'
    ? { relation: 'composes', reversed: true }
    : relationship === 'generalizes'
      ? { relation: 'extends', reversed: true }
      : { relation: relationship, reversed: false };

/**
 * The block types in force for a spec: those of `dialects`, else of the dialects its frontmatter extends; its own `ext`
 * blocks override them.
 */
export const specDeclarations = (text: string, dialects: readonly string[] = []): Declarations => {
  const ids = dialects.length > 0 ? dialects : extendsOf(text);
  return declarationsOf([...dialectTexts(ids), text]);
};
