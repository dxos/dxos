//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject } from '@dxos/client/echo';
import { Clipboard, Input } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

export type DebugObjectPanelProps = {
  object: ReactiveEchoObject<any>;
};

// TODO(burdon): Get schema and traverse references.
export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  const dxn = `dxn:echo:@:${object.id}`;
  return (
    <Clipboard.Provider>
      <div className='flex flex-col'>
        <Input.Root>
          <div role='none' className='flex flex-col gap-1'>
            <div role='none' className='flex gap-1'>
              <Input.TextInput disabled value={dxn} />
              <Clipboard.IconButton value={dxn} />
            </div>
          </div>
        </Input.Root>
        <SyntaxHighlighter classNames='flex text-xs' language='json'>
          {JSON.stringify(object, null, 2)}
        </SyntaxHighlighter>
      </div>
    </Clipboard.Provider>
  );
};
