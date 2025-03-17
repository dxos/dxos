//
// Copyright 2024 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { type TraceEvent, type InvocationTraceEvent } from '@dxos/functions';
import { type Space } from '@dxos/react-client/echo';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { Icon, List, ListItem, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../../meta';

export type LogsPanelProps = ThemedClassName<{
  space: Space;
}>;

export const LogsPanel = ({ space, classNames }: LogsPanelProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const edgeClient = useEdgeClient();
  const invocationTraceQueue = useQueue<InvocationTraceEvent>(edgeClient, space?.properties.invocationTraceQueue?.dxn);
  const [selected, setSelected] = useState<InvocationTraceEvent>();

  if (!invocationTraceQueue) {
    return <div>{t('no invocations message')}</div>;
  }

  const handleOpenChange = useCallback((trace: InvocationTraceEvent, open: boolean) => {
    setSelected(open ? trace : undefined);
  }, []);

  return (
    <List classNames={mx('overflow-y-auto', classNames)}>
      {invocationTraceQueue.items.map((trace) => (
        <InvocationTraceItem key={trace.id} trace={trace} open={selected?.id === trace.id} setOpen={handleOpenChange} />
      ))}
    </List>
  );
};

const InvocationTraceItem = ({
  trace,
  open,
  setOpen,
}: {
  trace: InvocationTraceEvent;
  open?: boolean;
  setOpen?: (trace: InvocationTraceEvent, open: boolean) => void;
}) => {
  const edgeClient = useEdgeClient();
  const eventQueue = useQueue<TraceEvent>(
    edgeClient,
    open ? decodeReference(trace.invocationTraceQueue).dxn : undefined,
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setOpen?.(trace, open);
    },
    [trace, setOpen],
  );

  const logs = useMemo(() => eventQueue?.items.flatMap((event) => event.logs), [eventQueue?.items]);
  const heading =
    'bodyText' in trace.input && typeof trace.input.bodyText === 'string'
      ? trace.input.bodyText
      : JSON.stringify(trace.input);

  return (
    <ListItem.Root key={trace.id} collapsible open={open} onOpenChange={handleOpenChange}>
      <div className='flex items-center gap-2'>
        <ListItem.OpenTrigger />
        <ListItem.Endcap classNames='flex items-center justify-center'>
          <Icon icon={trace.outcome === 'success' ? 'ph--check--regular' : 'ph--x--regular'} size={5} />
        </ListItem.Endcap>
        <ListItem.Heading classNames='flex-1 flex items-center truncate'>{heading}</ListItem.Heading>
      </div>
      {logs && (
        <ListItem.CollapsibleContent>
          <pre>
            <div>{JSON.stringify(trace.input, null, 2)}</div>
            {logs.map((log, index) => {
              return <div key={index}>{JSON.stringify(log, null, 2)}</div>;
            })}
          </pre>
        </ListItem.CollapsibleContent>
      )}
    </ListItem.Root>
  );
};
