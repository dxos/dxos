//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';

import { Key } from '@dxos/echo';

/**
 * Registration for a single URL prefix key.
 * `hasId` is a property of the registration, not the parser: a plank-opening key (e.g. `doc`)
 * always consumes a following id segment, while a companion key (e.g. `comments`) never does.
 */
export type KeyTableEntry = {
  key: string;
  hasId: boolean;
  /** Whether this key rebases the workspace (the anchor tier, `w`) — see `parse`. */
  anchor?: boolean;
};

/**
 * Lookup table from registered prefix key to its registration, used to drive both parsing and
 * validation. Callers (the graph builder's key-table derivation) own construction of this table;
 * this module has no graph dependency.
 */
export type KeyTable = ReadonlyMap<string, KeyTableEntry>;

/**
 * A single `(prefix, id?)` pair in a parsed URL chain, qualified with the workspace it resolves
 * against (the workspace in effect at the point the pair appeared, after any preceding `w` rebase).
 */
export type Pair = {
  key: string;
  id?: string;
  workspace: string;
};

/**
 * The result of parsing a `/w/<workspace>/...` pathname: the leading (default) workspace and the
 * ordered chain of pairs that follow it. A mid-chain `w` pair rebases `workspace` on later `Pair`s
 * but does not itself appear in `pairs`.
 */
export type ParsedUrl = {
  workspace: string;
  /** The anchor key that introduced the leading workspace (conventionally `w`); used to round-trip via {@link format}. */
  workspaceKey: string;
  pairs: Pair[];
};

/**
 * The single well-known key for every plank companion (`companion/<variant>`), resolved against the
 * preceding plank rather than registered by any extension.
 */
export const COMPANION_KEY = 'companion';

// The workspace key (`w`) is NOT reserved — it is a declared `kind: 'anchor'` binding.
const RESERVED_KEYS = new Set(['reset', 'redirect', 'not-found', COMPANION_KEY]);

/**
 * Whether a segment is reserved and therefore cannot be registered as a prefix key: the `w`
 * rebase key, app-level routing words, or anything shaped like a SpaceId or EntityId (reserved so
 * a registered key can never collide with an id segment).
 */
export const isReservedKey = (key: string): boolean =>
  RESERVED_KEYS.has(key) || Key.SpaceId.isValid(key) || Key.EntityId.isValid(key);

/**
 * Parse a browser pathname into a workspace plus an ordered chain of pairs, against a
 * caller-supplied key table.
 *
 * Grammar: `/<anchor>/<workspace>( /<pair> )*` where the leading pair must be an anchor key (a key with
 * `anchor: true` in the table, conventionally `w`), and `pair` is either another anchor pair
 * `<anchor>/<workspace>` (rebases the base for subsequent ids) or `<prefix>[/<id>]` (a registered key,
 * consuming an id iff `hasId`).
 *
 * Returns `Option.none()` for anything that doesn't fit the grammar: a leading key that is not a
 * registered anchor, an unregistered key, a `hasId` key missing its id, or a dangling anchor with no
 * following workspace segment. Callers route a `none` to a not-found page.
 */
export const parse = (pathname: string, table: KeyTable): Option.Option<ParsedUrl> => {
  const trimmed = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  const segments = trimmed.length > 0 ? trimmed.split('/') : [];

  const workspaceKey = segments[0];
  if (!workspaceKey || !table.get(workspaceKey)?.anchor || !segments[1]) {
    return Option.none();
  }

  const workspace = segments[1];
  const pairs: Pair[] = [];
  let base = workspace;
  let index = 2;

  while (index < segments.length) {
    const key = segments[index];
    const entry = table.get(key);
    if (entry?.anchor) {
      const nextWorkspace = segments[index + 1];
      if (!nextWorkspace) {
        // Dangling anchor with nothing to rebase onto.
        return Option.none();
      }
      base = nextWorkspace;
      index += 2;
      continue;
    }

    if (!entry) {
      // Unregistered key: the whole path is unparseable.
      return Option.none();
    }

    if (entry.hasId) {
      const id = segments[index + 1];
      if (!id) {
        // hasId key with no following id segment.
        return Option.none();
      }
      pairs.push({ key, id, workspace: base });
      index += 2;
    } else {
      pairs.push({ key, workspace: base });
      index += 1;
    }
  }

  return Option.some({ workspace, workspaceKey, pairs });
};

/**
 * Format a parsed URL back into a pathname, inserting an anchor pair (`workspaceKey`) whenever a pair's
 * workspace differs from the current base. `parse(format(x), table)` round-trips for any `x` produced by
 * `parse` against the same table.
 */
export const format = (parsed: ParsedUrl): string => {
  const segments: string[] = [parsed.workspaceKey, parsed.workspace];
  let base = parsed.workspace;

  for (const pair of parsed.pairs) {
    if (pair.workspace !== base) {
      segments.push(parsed.workspaceKey, pair.workspace);
      base = pair.workspace;
    }
    segments.push(pair.key);
    if (pair.id !== undefined) {
      segments.push(pair.id);
    }
  }

  return `/${segments.join('/')}`;
};
