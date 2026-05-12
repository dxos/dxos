//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type FC, type JSX, useMemo } from 'react';

import { type Trace } from '@dxos/compute';
import { type ThemedClassName } from '@dxos/react-ui';
import { JsonHighlighter, createElement } from '@dxos/react-ui-syntax-highlighter';

import { type InvocationSpan } from './hooks';

type RawDataPanelProps = {
  span: InvocationSpan;
  messages?: readonly Trace.Message[];
};

export const RawDataPanel: FC<ThemedClassName<RawDataPanelProps>> = ({ classNames, span, messages }) => {
  const combinedData = useMemo(() => {
    return {
      span,
      messages: messages ?? [],
    };
  }, [span, messages]);

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
