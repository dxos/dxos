//
// Copyright 2025 DXOS.org
//

import { JSONPath } from 'jsonpath-plus';
import React, { useEffect, useState } from 'react';

import { Input, ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';
import { composable, composableProps } from '@dxos/ui-theme';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

export type JsonProps = ThemedClassName<{
  data?: any;
  replacer?: CreateReplacerProps;
  testId?: string;
}>;

export const Json = composable<HTMLDivElement, JsonProps>(({ data, replacer, testId, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props, { classNames: 'dx-container py-1 px-2 text-sm' })} ref={forwardedRef}>
      <ScrollArea.Viewport asChild>
        <SyntaxHighlighter language='json' classNames='w-full text-sm' data-testid={testId}>
          {safeStringify(data, replacer && createReplacer(replacer), 2)}
        </SyntaxHighlighter>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

export const JsonFilter = composable<HTMLDivElement, JsonProps>(
  ({ data: dataProp, replacer, testId, ...props }, forwardedRef) => {
    const [data, setData] = useState(dataProp);
    const [text, setText] = useState('');
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      if (!dataProp || !text.trim().length) {
        setData(dataProp);
      } else {
        try {
          setData(JSONPath({ path: text, json: dataProp }));
          setError(null);
        } catch (err) {
          setData(dataProp);
          setError(err as Error);
        }
      }
    }, [dataProp, text]); // TODO(burdon): Need structural diff.

    return (
      <div {...composableProps(props, { role: 'none', classNames: 'dx-container flex flex-col' })} ref={forwardedRef}>
        <Input.Root validationValence={error ? 'error' : 'success'}>
          <Input.TextInput
            classNames={['p-1 px-2 font-mono', error && 'border-rose-500']}
            variant='subdued'
            value={text}
            placeholder='JSONPath (e.g., $.graph.nodes)'
            onChange={(event) => setText(event.target.value)}
          />
        </Input.Root>
        <Json data={data} replacer={replacer} testId={testId} />
      </div>
    );
  },
);
