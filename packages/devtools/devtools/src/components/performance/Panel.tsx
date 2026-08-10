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
  /** Standalone open state. Omit when the panel sits in a stack that owns an `Accordion.Root`. */
  open?: boolean;
  onToggle?: (id: string, open: boolean) => void;
}>;

export type CustomPanelProps<T> = Pick<PanelProps, 'id'> & T;

/**
 * A collapsible section. Open state comes from the enclosing `Accordion.Root` (the stats stack), or
 * from `open`/`onToggle` when the panel stands alone, in which case it supplies its own root.
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
  open,
  onToggle,
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

  const item = (
    <Accordion.Item item={{ id }}>
      <Accordion.ItemHeader icon={icon} trailing={action} classNames='text-sm text-fine'>
        {summary}
      </Accordion.ItemHeader>
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
    </Accordion.Item>
  );

  // `Accordion.Item` needs a root; a standalone panel has no stack to provide one.
  if (onToggle) {
    return (
      <Accordion.Root value={open ? [id] : []} onValueChange={(value) => onToggle(id, value.includes(id))}>
        {() => item}
      </Accordion.Root>
    );
  }

  return item;
};
