//
// Copyright 2025 DXOS.org
//

import { type ThemedClassName } from '@dxos/react-ui';

// TODO(burdon): Better place for these defs?

export type PreviewProps<T extends object> = ThemedClassName<{
  subject: T;
}>;

/**
 * NOTE: Padding for cards should be uniformly pli-3 plb-3, etc.
 */
// TODO(burdon): Define small set of common Card grid layouts.
//  Standardize Header, actions, image, grid layout, etc.
/**
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>
 *     <Card.Action>
 *   </Card.Header>
 *   <Card.Content>
 * </Card.Root>
 */
export const previewCard = 'popover-max-width overflow-hidden';
