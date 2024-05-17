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
      <table className='table-fixed w-full text-xs font-mono'>
        <tbody>
          {spans?.map(
            ({ id, resourceId, methodName, startTs, endTs }) =>
              endTs &&
              startTs && (
                <tr key={id}>
                  <td className='p-1 text-right'>{methodName}</td>
                  <td className='p-1 w-[80px] text-right'>{resourceId}</td>
                  <td className='p-1 w-[80px] text-right'>
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
