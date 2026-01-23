//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Use to jsonpath-plus.
import { forwardRef } from '@preact-signals/safe-react/react';
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

export type JsonProps = ThemedClassName<{
  data?: any;
  filter?: boolean;
  replacer?: CreateReplacerProps;
  testId?: string;
}>;

export const Json = forwardRef<HTMLDivElement, JsonProps>((props, forwardedRef) => {
  if (props.filter) {
    return <JsonFilter {...props} />;
  }

  const { classNames, data, replacer, testId } = props;
  return (
    <SyntaxHighlighter
      language='json'
      classNames={['is-full overflow-y-auto text-sm', classNames]}
      data-testid={testId}
      ref={forwardedRef}
    >
      {safeStringify(data, replacer && createReplacer(replacer), 2)}
    </SyntaxHighlighter>
  );
});

export const JsonFilter = forwardRef<HTMLDivElement, JsonProps>(
  ({ classNames, data: initialData, replacer, testId }, forwardedRef) => {
    const [data, setData] = useState(initialData);
    const [text, setText] = useState('');
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      if (!initialData || !text.trim().length) {
        setData(initialData);
      } else {
        try {
          setData(jp.query(initialData, text));
          setError(null);
        } catch (err) {
          setData(initialData);
          setError(err as Error);
        }
      }
    }, [initialData, text]); // TODO(burdon): Need structural diff.

    return (
      <div className='flex flex-col bs-full overflow-hidden' ref={forwardedRef}>
        <Input.Root validationValence={error ? 'error' : 'success'}>
          <Input.TextInput
            classNames={['p-1 pli-2 font-mono', error && 'border-rose-500']}
            variant='subdued'
            value={text}
            placeholder='JSONPath (e.g., $.graph.nodes)'
            onChange={(event) => setText(event.target.value)}
          />
        </Input.Root>
        <SyntaxHighlighter
          language='json'
          classNames={['is-full overflow-y-auto text-sm', classNames]}
          data-testid={testId}
        >
          {safeStringify(data, replacer && createReplacer(replacer), 2)}
        </SyntaxHighlighter>
      </div>
    );
  },
);
