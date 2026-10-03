//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';

import { type MessageOrRef } from './ConversationStack.tsx';

// Kept out of `ConversationStack.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Stable id for a message or unresolved ref, keying tiles and collapse state. */
export const keyOf = (message: MessageOrRef): string =>
  Ref.isRef(message) ? String(message.uri) : Obj.getURI(message);
