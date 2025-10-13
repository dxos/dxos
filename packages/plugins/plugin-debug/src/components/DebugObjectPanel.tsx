//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';
import { Clipboard, Input, Toolbar } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export type DebugObjectPanelProps = {
  object: Obj.Any;
};

// TODO(burdon): Get schema and traverse references.
export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  const dxn = `dxn:echo:@:${object.id}`;

  return (
    <Clipboard.Provider>
      <StackItem.Content toolbar>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput disabled value={dxn} />
            <Clipboard.IconButton value={dxn} />
          </Input.Root>
        </Toolbar.Root>
        <Json data={object} />
      </StackItem.Content>
    </Clipboard.Provider>
  );
};
