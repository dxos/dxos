//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { type TraceEvent, type InvocationSpan } from '@dxos/functions/types';
import { useQueue } from '@dxos/react-client/echo';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

type RawDataPanelProps = {
  span: InvocationSpan;
};

export const RawDataPanel: React.FC<RawDataPanelProps> = ({ span }) => {
  const traceQueueDxn = useMemo(() => {
    return span.invocationTraceQueue ? decodeReference(span.invocationTraceQueue).dxn : undefined;
  }, [span.invocationTraceQueue]);

  const eventQueue = useQueue<TraceEvent>(traceQueueDxn);

  const combinedData = useMemo(() => {
    return {
      span,
      traceEvents: eventQueue?.items ?? [],
    };
  }, [span, eventQueue?.items]);

  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: {
      type: 'element' | 'text';
      value?: string | number | undefined;
      tagName?: keyof React.JSX.IntrinsicElements | React.ComponentType<any> | undefined;
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
    <div className={mx('p-1', '[&_pre]:!overflow-visible')}>
      <SyntaxHighlighter language='json' renderer={rowRenderer}>
        {JSON.stringify(combinedData, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
