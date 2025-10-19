//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Use to jsonpath-plus.
import jp from 'jsonpath';
import React, { useEffect, useState } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

const defaultClassNames = '!m-0 grow overflow-y-auto text-sm';

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
      {JSON.stringify(data, replacer && createReplacer(replacer), 2)}
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
          classNames={['p-1 px-2 font-mono', error && 'border-red-500']}
          variant='subdued'
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='JSONPath (e.g., $.graph.nodes)'
        />
      </Input.Root>
      <SyntaxHighlighter language='json' classNames={[defaultClassNames, classNames]} data-testid={testId}>
        {JSON.stringify(data, replacer && createReplacer(replacer), 2)}
      </SyntaxHighlighter>
    </div>
  );
};

export type CreateReplacerProps = {
  omit?: string[];
  parse?: string[];
  maxDepth?: number;
  maxArrayLen?: number;
  maxStringLen?: number;
};

export type JsonReplacer = (this: any, key: string, value: any) => any;

export const createReplacer = ({
  omit,
  parse,
  maxDepth,
  maxArrayLen,
  maxStringLen,
}: CreateReplacerProps): JsonReplacer => {
  let currentDepth = 0;
  const depthMap = new WeakMap<object, number>();

  return function (this: any, key: string, value: any) {
    // Track depth.
    if (key === '') {
      currentDepth = 0;
    } else if (this && typeof this === 'object') {
      const parentDepth = depthMap.get(this) ?? 0;
      currentDepth = parentDepth + 1;
    }

    // Store depth for this object.
    if (value && typeof value === 'object') {
      depthMap.set(value, currentDepth);

      // Check max depth.
      if (maxDepth != null && currentDepth >= maxDepth) {
        return Array.isArray(value) ? `[{ length: ${value.length} }]` : `{ keys: ${Object.keys(value).length} }`;
      }
    }

    // Apply other filters.
    if (omit?.includes(key)) {
      return undefined;
    }
    if (parse?.includes(key) && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (maxArrayLen != null && Array.isArray(value) && value.length > maxArrayLen) {
      return `[length: ${value.length}]`;
    }
    if (maxStringLen != null && typeof value === 'string' && value.length > maxStringLen) {
      return value.slice(0, maxStringLen) + '...';
    }

    return value;
  };
};
