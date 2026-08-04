//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { NumericTabs, TextCrawl, TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock, type Message } from '@dxos/types';
import { type XmlWidgetProps } from '@dxos/ui-editor';
import { isNonNullable, safeParseJson } from '@dxos/util';

import { meta } from '#meta';

// Kept out of `ToolBlock.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const isToolMessage = (message: Message.Message) => {
  return message.blocks.some((block: ContentBlock.Any) => block._tag === 'toolCall' || block._tag === 'toolResult');
};
