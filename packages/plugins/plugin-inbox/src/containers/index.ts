//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CalendarArticle: ComponentType<any> = lazy(() =>
  import('./CalendarArticle').then((m) => ({ default: m.CalendarArticle })),
);
export const DraftMessageArticle: ComponentType<any> = lazy(() =>
  import('./DraftMessageArticle').then((m) => ({ default: m.DraftMessageArticle })),
);
export const EventArticle: ComponentType<any> = lazy(() =>
  import('./EventArticle').then((m) => ({ default: m.EventArticle })),
);
export const EventCard: ComponentType<any> = lazy(() => import('./EventCard').then((m) => ({ default: m.EventCard })));
export const MailboxArticle: ComponentType<any> = lazy(() =>
  import('./MailboxArticle').then((m) => ({ default: m.MailboxArticle })),
);
export const MailboxSettings: ComponentType<any> = lazy(() =>
  import('./MailboxSettings').then((m) => ({ default: m.MailboxSettings })),
);
export const MessageArticle: ComponentType<any> = lazy(() =>
  import('./MessageArticle').then((m) => ({ default: m.MessageArticle })),
);
export const MessageCard: ComponentType<any> = lazy(() =>
  import('./MessageCard').then((m) => ({ default: m.MessageCard })),
);
export const PopoverSaveFilter: ComponentType<any> = lazy(() =>
  import('./PopoverSaveFilter').then((m) => ({ default: m.PopoverSaveFilter })),
);
export const RelatedToContact: ComponentType<any> = lazy(() =>
  import('./RelatedToContact').then((m) => ({ default: m.RelatedToContact })),
);
export const RelatedToOrganization: ComponentType<any> = lazy(() =>
  import('./RelatedToOrganization').then((m) => ({ default: m.RelatedToOrganization })),
);
