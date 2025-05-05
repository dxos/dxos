//
// Copyright 2025 DXOS.org
//

import { type ThemedClassName } from '@dxos/react-ui';

// TODO(burdon): Better place for these defs?
export type PreviewProps<T extends object> = ThemedClassName<{
  subject: T;
}>;

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
export const previewCard = 'popover-max-width overflow-hidden';
export const previewTitle = 'text-lg font-medium line-clamp-2';
