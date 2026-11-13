//
// Copyright 2026 DXOS.org
//

import { findLayout } from '@dxos/scene';

import { type ExtraCommandDef } from '../editor/index.ts';

/** The first id of the form `base-n` a layout does not use. */
export const freeId = (elements: Readonly<Record<string, unknown>>, base: string): string => {
  let index = 1;
  while (elements[`${base}-${index}`] !== undefined) {
    index++;
  }
  return `${base}-${index}`;
};

/**
 * The commands that make one shape of several, which both dimensions offer as the same buttons: each writes the same
 * intent, and the model keeps a `solid` over the shapes it is made of. What the solid draws is its dimension's own
 * to work out: an outline in 2D, a mesh in 3D.
 */
export const SOLID_COMMANDS: readonly ExtraCommandDef[] = [
  {
    id: 'join',
    label: 'Join',
    icon: 'ph--unite--regular',
    enabled: ({ selection }) => selection.length > 1,
    run: ({ document, layout, selection, onIntent, select }) => {
      const id = freeId(findLayout(document, layout)?.elements ?? {}, 'union');
      onIntent(layout, { kind: 'join', id, operands: selection });
      select([id]);
    },
  },
  {
    id: 'subtract',
    label: 'Subtract',
    icon: 'ph--subtract--regular',
    // The first selected is the base, the second the tool cut from it.
    enabled: ({ selection }) => selection.length === 2,
    run: ({ document, layout, selection, onIntent, select }) => {
      const [base, tool] = selection;
      if (base && tool) {
        const id = freeId(findLayout(document, layout)?.elements ?? {}, 'difference');
        onIntent(layout, { kind: 'subtract', id, base, tool });
        select([id]);
      }
    },
  },
];
