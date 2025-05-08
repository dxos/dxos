//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Move to jsonpath-plus.
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

export type JsonProps = ThemedClassName<{ data?: any }>;

export const Json = ({ data, classNames }: JsonProps) => {
  return (
    <SyntaxHighlighter language='json' classNames={classNames}>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};

export const JsonFilter = ({ data: initialData, classNames }: JsonProps) => {
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
  }, [initialData, text]);

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
      <SyntaxHighlighter language='json' classNames={mx('grow overflow-y-auto', classNames)}>
        {JSON.stringify(data, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
