//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, URI } from '@dxos/keys';

import { AppCapabilities } from '../app-framework';

const NAVIGATION_PLUGIN = 'org.dxos.plugin.navigation';

/**
 * The single entry point for turning an object URI into a path {@link LayoutOperation.Open} can take.
 *
 * Most navigation knows its own destination — a message opened from a mailbox can spell the mailbox
 * path itself — but generic surfaces (a card, a search result, an agent following a reference) hold an
 * object and no idea where it lives in the tree. This fans out to every contributed
 * `AppCapabilities.NavigationTargetResolver`, so the answer comes from whichever plugin owns the
 * object's home, and returns targets canonical-first: a resolver that knows the object's real
 * location precedes the generic database-path fallback (see `NavigationTarget.fallback`). Callers
 * wanting one path take the first target.
 *
 * Deliberately separate from {@link LayoutOperation.Open}: Open's contract is paths in, planks out,
 * and it is handled by a plugin with no client dependency. Resolution needs a database, so it lives
 * here and is handled by the plugin that owns the client.
 */
export const ResolveNavigationTargets = Operation.make({
  meta: {
    key: DXN.make(`${NAVIGATION_PLUGIN}.operation.resolveNavigationTargets`),
    name: 'Resolve navigation targets',
    description:
      "Resolve a navigation path for the Open operation. Pass an object's URI (its DXN, e.g. a context object's <dxn>) as the query uri to resolve that object to its navigation target, or omit the query to list pages that can be navigated to. Targets are ordered best-first; pass the first target's path to Open.",
    icon: 'ph--compass--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    query: Schema.optional(
      Schema.Struct({
        // An object URI (e.g. a context object's `<dxn>`); accepts both `echo:` EIDs and `dxn:` DXNs.
        uri: Schema.optional(URI.Schema),
      }),
    ),
  }),
  output: Schema.Struct({
    targets: Schema.Array(AppCapabilities.NavigationTargetSchema),
  }),
});

/**
 * The ordering {@link ResolveNavigationTargets} promises: a resolver that knows where an object actually
 * lives outranks the generic database-path fallback, so `targets[0]` is the path a caller should open.
 * Order within each group is the order resolvers were contributed, so this is stable for a given plugin
 * set. Lives with the definition because it *is* the operation's output contract; the handler applies it.
 */
export const orderTargets = (
  targets: readonly AppCapabilities.NavigationTarget[],
): AppCapabilities.NavigationTarget[] => [
  ...targets.filter((target) => !target.fallback),
  ...targets.filter((target) => target.fallback),
];
