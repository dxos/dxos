//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const InboxHandlers = OperationHandlerSet.lazy(
  () => import('./classify'),
  () => import('./create'),
  () => import('./open'),
  () => import('./summarize'),
);

export { CalendarFunctions, CalendarHandlers } from './google/calendar';
export { GmailFunctions, GmailHandlers } from './google/gmail';
