//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AnchoredTo, Thread } from '@dxos/types';

export const ThreadSettingsSchema = Schema.mutable(Schema.Struct({}));
export type ThreadSettingsProps = Schema.Schema.Type<typeof ThreadSettingsSchema>;

export interface ThreadModel {
  root: Thread.Thread;
}

type SubjectId = string;
export type ViewState = { showResolvedThreads: boolean };
export type ViewStore = Record<SubjectId, ViewState>;

export type ThreadState = {
  /** Object toolbar state. */
  toolbar: Record<string, boolean>;
  /** In-memory draft threads. */
  // TODO(burdon): Drafts are getting lost.
  drafts: Record<string, AnchoredTo.AnchoredTo[]>;
  current?: string | undefined;
};
