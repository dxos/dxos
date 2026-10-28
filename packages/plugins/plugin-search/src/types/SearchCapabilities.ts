//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Database, type Obj } from '@dxos/echo';

import { meta } from '#meta';

/**
 * A row's translated label: the key, its namespace, and the values it interpolates.
 */
export type QueryActionLabel = [key: string, options: { ns: string } & Record<string, string | number>];

/** The row a query action offers for the text typed into the search dialog. */
export type QueryActionItem = {
  label: QueryActionLabel;
  icon?: string;
};

export type QueryActionContext = {
  /** The database of the space the dialog was opened in. */
  db: Database.Database;
};

/**
 * Something the search dialog can do with the text typed into it other than search for it — import
 * the pull request a pasted URL names, say. The dialog offers it above the results and opens the
 * object it answers with.
 */
export type QueryAction = {
  id: string;
  /**
   * The row for the text, or undefined when this action does not apply. Called on every keystroke,
   * so it must be synchronous and never touch the network.
   */
  match: (text: string) => QueryActionItem | undefined;
  /** Performs the action, answering with the object to open. */
  run: (text: string, context: QueryActionContext) => Effect.Effect<Obj.Any | undefined, Error>;
};

/**
 * Multi capability: each contributing plugin provides one batch of actions; the dialog flattens them.
 * Contributors activate on `SearchEvents.Start`, which the dialog fires when it opens.
 */
export const QueryAction = Capability.make<QueryAction[]>()(`${meta.profile.key}.capability.queryAction`);
