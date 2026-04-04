//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { JSONPath } from 'jsonpath-plus';
import React, { type PropsWithChildren, forwardRef, useEffect, useMemo, useState } from 'react';

import { Input } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

//
// Context
//

const JSON_NAME = 'Json';

type JsonContextType = {
  data: any;
  filteredData: any;
  filterText: string;
  setFilterText: (text: string) => void;
  filterError: Error | null;
  replacer?: CreateReplacerProps;
};

const [JsonProvider, useJsonContext] = createContext<JsonContextType>(JSON_NAME);

//
// Root
//

const JSON_ROOT_NAME = 'Json.Root';

type JsonRootProps = PropsWithChildren<{
  data?: any;
  replacer?: CreateReplacerProps;
}>;

/** Headless context provider for Json composite. */
const JsonRoot = forwardRef<HTMLDivElement, JsonRootProps>(({ children, data, replacer }, _forwardedRef) => {
  const [filterText, setFilterText] = useState('');
  const [filteredData, setFilteredData] = useState(data);
  const [filterError, setFilterError] = useState<Error | null>(null);

  useEffect(() => {
    if (!data || !filterText.trim().length) {
      setFilteredData(data);
      setFilterError(null);
    } else {
      try {
        setFilteredData(JSONPath({ path: filterText, json: data }));
        setFilterError(null);
      } catch (err) {
        setFilteredData(data);
        setFilterError(err as Error);
      }
    }
  }, [data, filterText]);

  const context = useMemo(
    () => ({ data, filteredData, filterText, setFilterText, filterError, replacer }),
    [data, filteredData, filterText, setFilterText, filterError, replacer],
  );

  return <JsonProvider {...context}>{children}</JsonProvider>;
});

JsonRoot.displayName = JSON_ROOT_NAME;

//
// Content
//

const JSON_CONTENT_NAME = 'Json.Content';

type JsonContentProps = ComposableProps;

/** Layout container for Json composite parts. */
const JsonContent = composable<HTMLDivElement, JsonContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { classNames: 'flex flex-col h-full overflow-hidden' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

JsonContent.displayName = JSON_CONTENT_NAME;

//
// Filter
//

const JSON_FILTER_NAME = 'Json.Filter';

type JsonFilterProps = ComposableProps<{
  placeholder?: string;
}>;

/** JSONPath filter input. Must be used within Json.Root. */
const JsonFilter = composable<HTMLInputElement, JsonFilterProps>(
  ({ placeholder = 'JSONPath (e.g., $.graph.nodes)', ...props }, forwardedRef) => {
    const { filterText, setFilterText, filterError } = useJsonContext(JSON_FILTER_NAME);

    return (
      <Input.Root validationValence={filterError ? 'error' : 'success'}>
        <Input.TextInput
          {...composableProps(props, {
            classNames: ['p-1 px-2 font-mono', filterError && 'border-rose-500'],
          })}
          variant='subdued'
          value={filterText}
          placeholder={placeholder}
          onChange={(event) => setFilterText(event.target.value)}
          ref={forwardedRef}
        />
      </Input.Root>
    );
  },
);

JsonFilter.displayName = JSON_FILTER_NAME;

//
// Data
//

const JSON_DATA_NAME = 'Json.Data';

type JsonDataProps = ComposableProps<{
  data?: any;
  replacer?: CreateReplacerProps;
  testId?: string;
}>;

/** Syntax-highlighted JSON display. Works standalone or within Json.Root. */
const JsonData = composable<HTMLDivElement, JsonDataProps>(
  ({ data: dataProp, replacer: replacerProp, testId, ...props }, forwardedRef) => {
    // Try to read from context; fall back to own props.
    let contextData: any;
    let contextReplacer: CreateReplacerProps | undefined;
    try {
      const context = useJsonContext(JSON_DATA_NAME);
      contextData = context.filteredData;
      contextReplacer = context.replacer;
    } catch {
      // No context — standalone mode.
    }

    const data = dataProp ?? contextData;
    const replacer = replacerProp ?? contextReplacer;

    return (
      <SyntaxHighlighter
        language='json'
        {...composableProps(props, { classNames: 'w-full py-1 px-2 overflow-y-auto text-sm' })}
        data-testid={testId}
        ref={forwardedRef}
      >
        {safeStringify(data, replacer && createReplacer(replacer), 2)}
      </SyntaxHighlighter>
    );
  },
);

JsonData.displayName = JSON_DATA_NAME;

//
// Json
//

export const Json = {
  Root: JsonRoot,
  Content: JsonContent,
  Filter: JsonFilter,
  Data: JsonData,
};

export type { JsonRootProps, JsonContentProps, JsonFilterProps, JsonDataProps };
