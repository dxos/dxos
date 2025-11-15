//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './MailboxSettings';
export * from './MailboxArticle';
export * from './Related';

export const CalendarArticle: ComponentType<any> = lazy(() => import('./CalendarArticle'));
export const MailboxArticle: ComponentType<any> = lazy(() => import('./MailboxArticle'));
export const MessageArticle: ComponentType<any> = lazy(() => import('./MessageArticle'));
export const MessageCard: ComponentType<any> = lazy(() => import('./MessageCard'));
