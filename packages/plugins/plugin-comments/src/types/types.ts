//
// Copyright 2023 DXOS.org
//

import { AnchoredTo, Thread } from '@dxos/types';

export interface ThreadModel {
  root: Thread.Thread;
}

export type CommentState = {
  /** Object toolbar state. */
  toolbar: Record<string, boolean>;
  /** In-memory draft threads. */
  drafts: Record<string, AnchoredTo.AnchoredTo[]>;
  current?: string | undefined;
};
