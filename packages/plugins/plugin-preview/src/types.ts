//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

// TODO(burdon): Better place for these defs?
export type PreviewProps<T extends object> = PropsWithChildren<
  ThemedClassName<{
    subject: T;
    role: string;
  }>
>;

// TODO(burdon): Update react-ui-card (to use grid) and re-use here.
// - See https://dxos-storybook.pages.dev/?path=/story/ui-react-ui-card-card--draggable
// - Standardize Header, actions, image, body, etc.
// - Support different grid layouts (e.g., image to the side, on top, etc.)
// - Should co-exist naturally with react-ui-form (e.g., as main content).
// - Considerations for drag-and-drop.
/**
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>
 *     <Card.Action>
 *   </Card.Header>
 *   <Card.Body>
 *     <Card.Image>
 *     <Form />
 *   </Card.Body>
 * </Card.Root>
 */
export const popoverCard = 'popover-card-width rounded-lg overflow-hidden';
export const defaultCard = '';
export const kanbanCardWithoutPoster = 'pbs-[--rail-action]';
export const previewTitle = 'text-lg font-medium line-clamp-2';
export const previewProse = 'pli-3 mlb-3';
export const previewChrome = 'pli-1.5 mlb-1.5 [&_.dx-button]:pli-1.5 [&_.dx-button]:text-start [&_.dx-button]:is-full';
