//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject } from '@dxos/client/echo';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

export type DebugObjectPanelProps = {
  object: ReactiveEchoObject<any>;
};

// TODO(burdon): Get schema and traverse references.
export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  return (
    <div className='flex flex-col'>
      <SyntaxHighlighter classNames='flex text-xs' language='json'>
        {JSON.stringify(object, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
