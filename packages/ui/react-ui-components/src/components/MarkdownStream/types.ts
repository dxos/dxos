//
// Copyright 2025 DXOS.org
//

import type { ThemedClassName } from '@dxos/react-ui';

import type { StreamerOptions, XmlTagOptions } from './extensions';

export type UseMarkdownStreamProps = {
  content?: string;
  perCharacterDelay?: number;
} & XmlTagOptions &
  StreamerOptions;

export type MarkdownStreamProps = ThemedClassName<UseMarkdownStreamProps>;
