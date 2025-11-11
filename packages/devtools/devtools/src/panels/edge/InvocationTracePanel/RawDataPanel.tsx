//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type FC, type JSX, useMemo } from 'react';

import { type InvocationSpan } from '@dxos/functions-runtime';
import { TraceEvent } from '@dxos/functions-runtime';
import { Filter, type Queue, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';

type RawDataPanelProps = {
  span: InvocationSpan;
  queue?: Queue;
};

export const RawDataPanel: FC<ThemedClassName<RawDataPanelProps>> = ({ classNames, span, queue }) => {
  const objects = useQuery(queue, Filter.type(TraceEvent));

  const combinedData = useMemo(() => {
    return {
      span,
      traceEvents: objects ?? [],
    };
  }, [span, objects]);

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
    <SyntaxHighlighter language='json' className={classNames} renderer={rowRenderer}>
      {JSON.stringify(combinedData, null, 2)}
    </SyntaxHighlighter>
  );
};
