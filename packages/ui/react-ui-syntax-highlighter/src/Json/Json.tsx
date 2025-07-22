//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Move to jsonpath-plus.
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

export type JsonProps = ThemedClassName<{ data?: any; testId?: string }>;

export const Json = ({ data, classNames, testId }: JsonProps) => {
  return (
    <SyntaxHighlighter language='json' classNames={['w-full', classNames]} data-testid={testId}>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};

export const JsonFilter = ({ data: initialData, classNames, testId }: JsonProps) => {
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
          classNames={mx('p-1 px-2 font-mono', error && 'border-red-500')}
          variant='subdued'
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='JSONPath (e.g., $.graph.nodes)'
        />
      </Input.Root>
      <SyntaxHighlighter language='json' classNames={mx('grow overflow-y-auto', classNames)} data-testid={testId}>
        {JSON.stringify(data, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
