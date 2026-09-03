//
// Copyright 2025 DXOS.org
//

import { type InboxStackItem, type MessageGroup } from './InboxStack.tsx';

// Kept out of `InboxStack.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const isMessageGroup = (item: InboxStackItem): item is MessageGroup => 'messages' in item;
