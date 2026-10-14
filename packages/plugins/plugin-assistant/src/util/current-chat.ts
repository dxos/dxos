//
// Copyright 2026 DXOS.org
//

import { Obj, type Ref, URI } from '@dxos/echo';

/**
 * Resolves the chat a companion shows from the URI `SetCurrentChat` stored for its subject.
 *
 * The stored value is `Obj.getURI(chat)` — an `echo://` URI, which `makeRef` takes as is; parsing
 * it as a DXN rejects it, and the companion would never show the chosen chat.
 */
export const currentChatRef = (subject: Obj.Unknown, uri: string | undefined): Ref.Ref<Obj.Unknown> | undefined =>
  URI.isURI(uri) ? Obj.getDatabase(subject)?.makeRef<Obj.Unknown>(uri) : undefined;
