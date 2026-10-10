//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type WidgetProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { PANEL_FRAME, WidgetPanel } from './WidgetPanel.tsx';

export const FallbackWidget = ({ _tag, ...props }: WidgetProps) => (
  <WidgetPanel icon='ph--brackets-curly--regular' label={_tag} testId='assistant.fallback' lazyMount>
    <JsonHighlighter
      data={props}
      // Inline axis only, as in the tool panel: a long line scrolls here rather than widening the row.
      scroll='horizontal'
      classNames={mx(PANEL_FRAME, 'p-trim-sm text-xs bg-transparent')}
    />
  </WidgetPanel>
);

FallbackWidget.displayName = 'Fallback';
