//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';

import { type AnyLens } from './types.ts';

//
// Static lens registry. `lensesFor` answers "how else can I view this object"; `sourcesFor` answers
// "what can this interface accept" — the reverse lookup that lets one UI serve many source types.
//

const byId = new Map<string, AnyLens>();

const typename = (entity: Type.AnyObj | string): string =>
  typeof entity === 'string' ? entity : Type.getTypename(entity);

/** Register a code-defined lens. Re-registering the same id replaces it. */
export const register = <L extends AnyLens>(lens: L): L => {
  byId.set(lens.id, lens);
  return lens;
};

export const resolve = (id: string): AnyLens | undefined => byId.get(id);

/** Every registered lens whose source is this type. */
export const lensesFor = (source: Type.AnyObj | string): readonly AnyLens[] => {
  const name = typename(source);
  return [...byId.values()].filter((lens) => Type.getTypename(lens.source) === name);
};

/** Every registered lens whose target is this type — the sources an interface can accept. */
export const sourcesFor = (target: Type.AnyObj | string): readonly AnyLens[] => {
  const name = typename(target);
  return [...byId.values()].filter((lens) => {
    const entity = lens.target as Type.AnyEntity;
    return Type.isType(entity) && Type.getTypename(entity) === name;
  });
};

/** Drop every registration. For tests. */
export const clear = (): void => {
  byId.clear();
};
