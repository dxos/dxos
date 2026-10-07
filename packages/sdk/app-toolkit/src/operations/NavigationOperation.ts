//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN, URI } from '@dxos/keys';

const NAVIGATION_PLUGIN = 'org.dxos.plugin.navigation';

/**
 * A resolved target as callers see it. `AppCapabilities.NavigationTarget` additionally carries the
 * resolver's `position`, which orders these before they are returned and is of no use downstream — so it
 * stays out of the wire format (it also holds `Position.last`, an Infinity that would not survive JSON).
 */
const TargetSchema = Schema.Struct({
  path: Schema.String.annotate({ description: 'Navigation path to use with the Open operation.' }),
  label: Schema.String.annotate({ description: 'Human-readable label.' }),
  type: Schema.String.annotate({ description: 'Object type.' }),
});

/**
 * The single entry point for turning an object URI into a path {@link LayoutOperation.Open} can take.
 *
 * Most navigation knows its own destination — a message opened from a mailbox can spell the mailbox
 * path itself — but generic surfaces (a card, a search result, an agent following a reference) hold an
 * object and no idea where it lives in the tree. This fans out to every contributed
 * `AppCapabilities.NavigationTargetResolver`, so the answer comes from whichever plugin owns the
 * object's home, and returns targets in resolver `position` order: one that knows the object's real
 * location precedes the generic database-path answer, which declares `Position.last`. Callers wanting
 * one path take the first target.
 *
 * Deliberately separate from {@link LayoutOperation.Open}: Open's contract is paths in, planks out,
 * and it is handled by a plugin with no client dependency. Resolution needs a database, so it lives
 * here and is handled by the plugin that owns the client.
 */
export const ResolveNavigationTargets = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.resolveNavigationTargets'),
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
    targets: Schema.Array(TargetSchema).annotate({
      description:
        'Resolved targets, best-first: a resolver that knows where the object actually lives precedes the generic database-path answer, so the first target is the one to open.',
    }),
  }),
});
