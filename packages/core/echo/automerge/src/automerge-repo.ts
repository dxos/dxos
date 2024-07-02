//
// Copyright 2023 DXOS.org
//

import { type BinaryDocumentId, type AutomergeUrl, stringifyAutomergeUrl } from '@automerge/automerge-repo';
import * as Uuid from 'uuid';

export * from '@automerge/automerge-repo';

/**
 * Returns a new Automerge URL with a random UUID documentId. Called by Repo.create(), and also used by tests.
 * Copy-paste from automerge-repo.
 * Copyright (c) 2019-2023, Ink & Switch LLC.
 * Is not exported in @automerge/automerge-repo.
 */
export const generateAutomergeUrl = (): AutomergeUrl => {
  const documentId = Uuid.v4(null, new Uint8Array(16)) as BinaryDocumentId;
  return stringifyAutomergeUrl({ documentId });
};
