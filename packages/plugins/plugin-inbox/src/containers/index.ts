//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AttachmentArticle: ComponentType<any> = lazy(() => import('./AttachmentArticle/index.ts'));
export const CalendarArticle: ComponentType<any> = lazy(() => import('./CalendarArticle/index.ts'));
export const CalendarProperties: ComponentType<any> = lazy(() => import('./CalendarProperties/index.ts'));
export const EditMessageArticle: ComponentType<any> = lazy(() => import('./EditMessageArticle/index.ts'));
export const EventArticle: ComponentType<any> = lazy(() => import('./EventArticle/index.ts'));
export const EventCard: ComponentType<any> = lazy(() => import('./EventCard/index.ts'));
export const MailboxArticle: ComponentType<any> = lazy(() => import('./MailboxArticle/index.ts'));
export const MailboxProperties: ComponentType<any> = lazy(() => import('./MailboxProperties/index.ts'));
export const MessageArticle: ComponentType<any> = lazy(() => import('./MessageArticle/index.ts'));
export const MessageCard: ComponentType<any> = lazy(() => import('./MessageCard/index.ts'));
export const SaveFilterPopover: ComponentType<any> = lazy(() => import('./SaveFilterPopover/index.ts'));
export const SubscriptionsArticle: ComponentType<any> = lazy(() => import('./SubscriptionsArticle/index.ts'));
export const RelatedToContact: ComponentType<any> = lazy(() => import('./RelatedToContact/index.ts'));
export const RelatedToOrganization: ComponentType<any> = lazy(() => import('./RelatedToOrganization/index.ts'));
