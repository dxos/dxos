//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type XmlWidgetProps } from '@dxos/ui-editor';

export const FallbackWidget = ({ _tag, ...props }: XmlWidgetProps) => {
  return (
    <TogglePanel.Root>
      <TogglePanel.Content>
        <TogglePanel.Header classNames='dx-group-surface'>{_tag}</TogglePanel.Header>
        <TogglePanel.Body classNames='dx-modal-surface'>
          <TogglePanel.Viewport>
            <JsonHighlighter classNames='p-2! text-sm' data={props} />
          </TogglePanel.Viewport>
        </TogglePanel.Body>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};

FallbackWidget.displayName = 'Fallback';
