//
// Copyright 2024 DXOS.org
//

import { AlignCenterHorizontalSimple } from '@phosphor-icons/react';
import React from 'react';

import { type Span } from '@dxos/protocols/proto/dxos/tracing';

import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

export const SpansPanel = ({ spans, ...props }: CustomPanelProps<{ spans?: Span[] }>) => {
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
            (span) =>
              span.endTs &&
              span.startTs && (
                <tr key={span.id}>
                  <td className='p-1 text-right'>{span.methodName}</td>
                  <td className='p-1 w-[80px]' />
                  <td className='p-1 w-[80px] text-right'>
                    <Duration duration={parseInt(span.endTs) - parseInt(span.startTs)} />
                  </td>
                </tr>
              ),
          )}
        </tbody>
      </table>
    </Panel>
  );
};
