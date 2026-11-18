//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import type * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

/** The query parameter that names, by its DXN without the `dxn:` prefix, the action a link runs on the object it opens. */
export const PARAM = 'action';

/** A copied link: `internal` opens Composer, `public` opens a published space in the viewer. */
export type Kind = 'internal' | 'public';

/**
 * An action a link can run on the object it opens. Plugins contribute them; a link can name no other.
 * A link action changes only what the reader sees, never the space.
 */
export type LinkAction = {
  id: DXN.DXN;
  /** The copied links that carry it. */
  links: readonly Kind[];
  appliesTo: (data: unknown) => boolean;
  run: (data: unknown) => Effect.Effect<void, unknown, Operation.Service>;
};

/** `url` naming the first action that `kind` links to `data` carry, or `url` unchanged when none does. */
export const withAction = (url: URL, actions: readonly LinkAction[], kind: Kind, data: unknown): URL => {
  const action = actions.find((action) => action.links.includes(kind) && action.appliesTo(data));
  if (!action) {
    return url;
  }
  const next = new URL(url);
  next.searchParams.set(PARAM, DXN.getName(action.id));
  return next;
};

/** The action `url` names, when one is contributed and applies to `data`. */
export const find = (url: URL, actions: readonly LinkAction[], data: unknown): LinkAction | undefined => {
  const name = url.searchParams.get(PARAM);
  const id = name ? DXN.tryMake(`dxn:${name}`) : undefined;
  return id ? actions.find((action) => action.id === id && action.appliesTo(data)) : undefined;
};

export const withoutAction = (url: URL): URL => {
  const next = new URL(url);
  next.searchParams.delete(PARAM);
  return next;
};
