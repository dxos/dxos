//
// Copyright 2024 DXOS.org
//

import { AlignCenterHorizontalSimple } from '@phosphor-icons/react';
import React from 'react';

import { type Span } from '@dxos/protocols/proto/dxos/tracing';

import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

// TODO(burdon): Classname?
export const SpansPanel = ({ spans, ...props }: CustomPanelProps<{ spans?: Span[] }>) => {
  if (!spans?.length) {
    return null;
  }

  return (
    <Panel
      {...props}
      icon={AlignCenterHorizontalSimple}
      title='Spans'
      info={<span>{spans?.length.toLocaleString()}</span>}
    >
      <table className='w-full table-fixed font-mono text-xs'>
        <tbody>
          {spans?.map(
            ({ id, resourceId, methodName, startTs, endTs }) =>
              endTs &&
              startTs && (
                <tr key={id}>
                  <td className='p-1 text-right'>{methodName}</td>
                  <td className='w-[80px] p-1 text-right'>{resourceId}</td>
                  <td className='w-[80px] p-1 text-right'>
                    <Duration duration={parseInt(endTs) - parseInt(startTs)} />
                  </td>
                </tr>
              ),
          )}
        </tbody>
      </table>
    </Panel>
  );
};
