//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type FC, type JSX, useMemo } from 'react';

import { type InvocationSpan } from '@dxos/compute-runtime';
import { type TraceEvent } from '@dxos/compute-runtime';
import { JsonHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';
import type * as Util from '@dxos/react-ui/Util';

type RawDataPanelProps = {
  span: InvocationSpan;
  objects?: TraceEvent[];
};

export const RawDataPanel: FC<Util.ThemedClassName<RawDataPanelProps>> = ({ classNames, span, objects }) => {
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

  return <JsonHighlighter data={combinedData} classNames={classNames} renderer={rowRenderer} />;
};
