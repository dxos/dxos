//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SignalApi } from '@dxos/network-manager';
import { JsonTreeView } from '@dxos/react-ux';

export interface SignalTraceProps {
  trace: SignalApi.CommandTrace[],
}

export const SignalTrace = ({ trace }: SignalTraceProps) => (
  <div style={{ overflowY: 'auto' }}>
    {trace.map(msg => (
      <div style={{ color: msg.error ? 'red' : undefined }} key={msg.messageId}>
        {msg.incoming ? 'inc' : 'out'} {msg.method} {msg.time} ms
        <JsonTreeView data={{ msg }} depth={0} root={undefined as any} size={undefined as any} onSelect={undefined as any} />
      </div>
    ))}
  </div>
);
