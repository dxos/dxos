//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { type MessageThreadContext } from '../sync';

export const FallbackWidget = ({ _tag, ...props }: XmlWidgetProps<MessageThreadContext>) => {
  return (
    <TogglePanel.Root>
      <TogglePanel.Header>{_tag}</TogglePanel.Header>
      <TogglePanel.Content>
        <Json.Data classNames='p-1 text-sm' data={props} />
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
