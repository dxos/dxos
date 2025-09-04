//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Use to jsonpath-plus.
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

const defaultClassNames = '!m-0 grow overflow-y-auto';

export type JsonReplacer = (this: any, key: string, value: any) => any;

export type JsonProps = ThemedClassName<{ testId?: string; data?: any; replacer?: JsonReplacer }>;

export const Json = ({ data, testId, classNames, replacer }: JsonProps) => {
  return (
    <SyntaxHighlighter language='json' classNames={[defaultClassNames, classNames]} data-testid={testId}>
      {JSON.stringify(data, replacer, 2)}
    </SyntaxHighlighter>
  );
};

export const JsonFilter = ({ data: initialData, ...params }: JsonProps) => {
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
          classNames={['p-1 px-2 font-mono', error && 'border-red-500']}
          variant='subdued'
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='JSONPath (e.g., $.graph.nodes)'
        />
      </Input.Root>
      <Json data={data} {...params} />
    </div>
  );
};

export type CreateReplacerProps = {
  omit?: string[];
  parse?: string[];
};
