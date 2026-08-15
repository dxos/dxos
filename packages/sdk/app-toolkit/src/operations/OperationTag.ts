//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * The common operation tags.
 *
 * A tag is a coarse answer to "what kind of work is this?", set on an operation's `meta.tags` and
 * carried onto its trace events, so consumers can select a useful subset of the hundreds of
 * operations the runtime invokes (the assistant's trace panel filters on them). An operation may
 * carry several.
 *
 * `Operation.meta.tags` is typed `readonly string[]` so `@dxos/compute` owns no vocabulary and a
 * plugin can coin its own tag; these are the shared set the app itself is classified by. Prefer
 * them — a one-off tag is invisible to anything that presents tags by name.
 */

/** Chrome and view state: dialogs, popovers, toasts, sidebars, plank layout, view toggles. */
export const Layout = 'layout';

/** Moving around: opening, closing, and selecting what is on screen. */
export const Navigation = 'navigation';

/** Agentic work and the machinery around it: agents, skills, tools, triggers, routines, memory. */
export const Assistant = 'assistant';

/** Exchange with an external service: sync, materialization, and remote target discovery. */
export const Connector = 'connector';

/** Reading and writing the local graph: objects, relations, schema, spaces. */
export const Database = 'database';

/** Identity, devices, credentials, and service access. */
export const Identity = 'identity';

/** Internal plumbing, debug affordances, and samples. */
export const System = 'system';

/** Closed union of {@link all}. */
export type Tag =
  | typeof Layout
  | typeof Navigation
  | typeof Assistant
  | typeof Connector
  | typeof Database
  | typeof Identity
  | typeof System;

/** Every common tag, in the order consumers should present them. */
export const all: readonly Tag[] = [Layout, Navigation, Assistant, Connector, Database, Identity, System];

/** Whether a tag is one of the common ones. */
export const isTag = (tag: string): tag is Tag => (all as readonly string[]).includes(tag);
