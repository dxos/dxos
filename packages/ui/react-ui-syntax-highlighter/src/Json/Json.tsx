//
// Copyright 2025 DXOS.org
//

import { JSONPath } from 'jsonpath-plus';
import React, {
  createContext,
  type PropsWithChildren,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Input } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';
import { type CreateReplacerProps, createReplacer, safeStringify } from '@dxos/util';

import { SyntaxHighlighter } from '../SyntaxHighlighter';

//
// Context
//

type JsonContextType = {
  data: any;
  filteredData: any;
  filterText: string;
  setFilterText: (text: string) => void;
  filterError: Error | null;
  replacer?: CreateReplacerProps;
};

const JsonContext = createContext<JsonContextType | null>(null);

/** Require Json context (throws if used outside Json.Root). */
const useJsonContext = (consumerName: string): JsonContextType => {
  const context = useContext(JsonContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`Json.Root\`.`);
  }
  return context;
};

/** Optional Json context (returns null outside Json.Root). */
const useOptionalJsonContext = (): JsonContextType | null => {
  return useContext(JsonContext);
};

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
    if (!filterText.trim().length) {
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

  return <JsonContext.Provider value={context}>{children}</JsonContext.Provider>;
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
    <div
      {...composableProps(props, { role: 'none', classNames: 'flex flex-col h-full min-h-0 overflow-hidden' })}
      ref={forwardedRef}
    >
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
const JsonFilter = forwardRef<HTMLInputElement, JsonFilterProps>(
  ({ classNames, placeholder = 'JSONPath (e.g., $.graph.nodes)' }, forwardedRef) => {
    const { filterText, setFilterText, filterError } = useJsonContext(JSON_FILTER_NAME);

    return (
      <Input.Root validationValence={filterError ? 'error' : 'success'}>
        <Input.TextInput
          classNames={['p-1 px-2 font-mono', filterError && 'border-rose-500', classNames]}
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
    const context = useOptionalJsonContext();
    const data = dataProp ?? context?.filteredData;
    const replacer = replacerProp ?? context?.replacer;

    return (
      <SyntaxHighlighter
        {...composableProps(props, { classNames: 'flex-1 min-h-0 w-full py-1 px-2 overflow-y-auto text-sm' })}
        language='json'
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
