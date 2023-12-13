//
// Copyright 2023 DXOS.org
//

import type * as A from '@dxos/automerge/automerge';

export type IDocHandle<T = any> = {
  docSync(): A.Doc<T> | undefined;
  change(callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): void;
  changeAt(heads: A.Heads, callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): string[] | undefined;

  addListener(event: 'change', listener: () => void): void;
  removeListener(event: 'change', listener: () => void): void;
};
