//
// Copyright 2025 DXOS.org
//

import { type ThemedClassName } from '@dxos/react-ui';

// TODO(burdon): Better place for these defs?

export type PreviewProps<T extends object> = ThemedClassName<{
  subject: T;
}>;

export const previewCard = 'popover-max-width overflow-hidden';
