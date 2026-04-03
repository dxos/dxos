//
// Copyright 2023 DXOS.org
//

import { AnchoredTo, Thread } from '@dxos/types';

export { ThreadSettingsSchema, type ThreadSettingsProps } from './Settings';

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
