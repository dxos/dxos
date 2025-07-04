//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type FC, type JSX, useMemo } from 'react';

import { type TraceEvent, type InvocationSpan } from '@dxos/functions';
import { useQueue } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

type RawDataPanelProps = {
  span: InvocationSpan;
};

export const RawDataPanel: FC<ThemedClassName<RawDataPanelProps>> = ({ classNames, span }) => {
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? span.invocationTraceQueue.dxn : undefined;
  }, [span.invocationTraceQueue]);

  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  const combinedData = useMemo(() => {
    return {
      span,
      traceEvents: eventQueue?.objects ?? [],
    };
  }, [span, eventQueue?.objects]);

  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: {
      type: 'element' | 'text';
      value?: string | number | undefined;
      tagName?: keyof JSX.IntrinsicElements | ComponentType<any> | undefined;
      properties?: { className: any[]; [key: string]: any };
      children?: any[];
    }[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  return (
    <SyntaxHighlighter
      className={mx('p-1 [&_pre]:!overflow-visible', classNames)}
      language='json'
      renderer={rowRenderer}
    >
      {JSON.stringify(combinedData, null, 2)}
    </SyntaxHighlighter>
  );
};
