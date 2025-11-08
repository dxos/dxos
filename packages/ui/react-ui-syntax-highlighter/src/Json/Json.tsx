//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Use to jsonpath-plus.
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

const defaultClassNames = 'grow overflow-y-auto text-sm';

export type JsonProps = ThemedClassName<{
  data?: any;
  filter?: boolean;
  replacer?: CreateReplacerProps;
  testId?: string;
}>;

export const Json = ({ filter, ...params }: JsonProps) => {
  if (filter) {
    return <JsonFilter {...params} />;
  }

  const { classNames, data, replacer, testId } = params;
  return (
    <SyntaxHighlighter language='json' classNames={[defaultClassNames, classNames]} data-testid={testId}>
      {safeStringify(data, replacer && createReplacer(replacer), 2)}
    </SyntaxHighlighter>
  );
};

export const JsonFilter = ({ classNames, data: initialData, replacer, testId }: JsonProps) => {
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
    <div className='flex flex-col grow overflow-hidden'>
      <Input.Root validationValence={error ? 'error' : 'success'}>
        <Input.TextInput
          classNames={['p-1 pli-2 font-mono', error && 'border-red-500']}
          variant='subdued'
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='JSONPath (e.g., $.graph.nodes)'
        />
      </Input.Root>
      <SyntaxHighlighter language='json' classNames={[defaultClassNames, classNames]} data-testid={testId}>
        {safeStringify(data, replacer && createReplacer(replacer), 2)}
      </SyntaxHighlighter>
    </div>
  );
};
