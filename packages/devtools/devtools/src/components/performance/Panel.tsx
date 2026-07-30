//
// Copyright 2024 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { Accordion } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

export type PanelProps = ThemedClassName<{
  id: string;
  icon: string;
  title: string;
  /** Static summary shown on the header row (counts, sizes); rendered inside the toggle. */
  info?: JSX.Element;
  /** Interactive control shown on the header row; rendered beside the toggle, not inside it. */
  action?: JSX.Element;
  padding?: boolean;
  /** Clamp the body and let it scroll; `0` leaves the body unclamped. */
  maxHeight?: number;
}>;

export type CustomPanelProps<T> = Pick<PanelProps, 'id'> & T;

/**
 * A collapsible section of the stats stack. Open state is owned by the enclosing `Accordion.Root`.
 */
export const Panel = ({
  classNames,
  children,
  id,
  icon,
  title,
  info,
  action,
  padding = true,
  maxHeight = 240,
}: PropsWithChildren<PanelProps>) => {
  const summary = (
    <div className='flex items-center justify-between gap-2'>
      <span className='truncate'>{title}</span>
      {info}
    </div>
  );

  // Panels with no body (Stats, Memory, Network) are summary rows, not disclosures — rendering them
  // as accordion items would show a caret that expands nothing.
  if (!children) {
    return (
      <div className='flex items-start gap-2 p-2 text-sm text-fine'>
        <span className='flex items-center h-6 shrink-0'>
          <Icon icon={icon} size={4} />
        </span>
        <div className='min-w-0 flex-1'>{summary}</div>
        {action && <span className='flex items-center h-6 shrink-0'>{action}</span>}
      </div>
    );
  }

  return (
    <Accordion.Item item={{ id }}>
      <Accordion.ItemHeader icon={icon} trailing={action} classNames='text-sm text-fine'>
        {summary}
      </Accordion.ItemHeader>
      {children && (
        <Accordion.ItemBody
          classNames={mx(
            'flex flex-col',
            maxHeight ? 'overflow-y-auto' : 'overflow-hidden',
            !padding && 'p-0',
            classNames,
          )}
          style={maxHeight ? { maxHeight } : undefined}
        >
          {children}
        </Accordion.ItemBody>
      )}
    </Accordion.Item>
  );
};
