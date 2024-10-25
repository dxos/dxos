//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoReactiveObject } from '@dxos/client/echo';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

export type DebugObjectPanelProps = {
  object: EchoReactiveObject<any>;
};

export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  console.log(JSON.stringify(object, null, 2));
  return (
    <div role='form' className='flex flex-col'>
      <SyntaxHighlighter classNames='flex text-xs' language='json'>
        {JSON.stringify(object, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
