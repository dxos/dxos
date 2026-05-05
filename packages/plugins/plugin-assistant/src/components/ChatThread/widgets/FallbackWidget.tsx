//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { type MessageThreadContext } from '../sync';

export const FallbackWidget = ({ _tag, ...props }: XmlWidgetProps<MessageThreadContext>) => {
  return (
    <TogglePanel.Root>
      <TogglePanel.Header classNames='bg-group-surface'>{_tag}</TogglePanel.Header>
      <TogglePanel.Content classNames='bg-modal-surface'>
        <TogglePanel.Viewport>
          <JsonHighlighter classNames='p-2! text-sm' data={props} />
        </TogglePanel.Viewport>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};

FallbackWidget.displayName = 'Fallback';
