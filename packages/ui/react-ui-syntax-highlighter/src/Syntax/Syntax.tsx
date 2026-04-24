//
// Copyright 2025 DXOS.org
//

import { JSONPath } from 'jsonpath-plus';
import React, {
  type FC,
  type PropsWithChildren,
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useState,
} from 'react';

import { Input, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { JsonHighlighter, type JsonReplacer } from '../JsonHighlighter';
import { SyntaxHighlighter } from '../SyntaxHighlighter';

//
// Context
//

type SyntaxContextType = {
  mode: 'text' | 'json';
  // Text mode.
  source?: string;
  language?: string;
  // JSON mode.
  data?: any;
  filteredData?: any;
  filterText: string;
  setFilterText: (text: string) => void;
  filterError: Error | null;
  replacer?: JsonReplacer;
};

const SyntaxContext = createContext<SyntaxContextType | null>(null);

const useSyntaxContext = (consumerName: string): SyntaxContextType => {
  const context = useContext(SyntaxContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`Syntax.Root\`.`);
  }
  return context;
};

//
// Root
//

const SYNTAX_ROOT_NAME = 'Syntax.Root';

type SyntaxRootProps = PropsWithChildren<{
  // Text mode.
  language?: string;
  source?: string;
  // JSON mode (defined `data` selects JSON mode; explicit `undefined` falls back to text mode).
  data?: any;
  replacer?: JsonReplacer;
}>;

/** Headless context provider. Selects JSON mode when `data` is defined; text mode otherwise. */
const SyntaxRoot: FC<SyntaxRootProps> = ({ children, language, source, replacer, data }) => {
  const isJson = data !== undefined;
  const [filterText, setFilterText] = useState('');

  const { filteredData, filterError } = useMemo<{ filteredData: any; filterError: Error | null }>(() => {
    if (!isJson || !filterText.trim().length) {
      return { filteredData: data, filterError: null };
    }
    try {
      return { filteredData: JSONPath({ path: filterText, json: data }), filterError: null };
    } catch (err) {
      return { filteredData: data, filterError: err as Error };
    }
  }, [isJson, data, filterText]);

  const context = useMemo<SyntaxContextType>(
    () => ({
      mode: isJson ? 'json' : 'text',
      source,
      language,
      data,
      filteredData,
      filterText,
      setFilterText,
      filterError,
      replacer,
    }),
    [isJson, source, language, data, filteredData, filterText, filterError, replacer],
  );

  return <SyntaxContext.Provider value={context}>{children}</SyntaxContext.Provider>;
};

SyntaxRoot.displayName = SYNTAX_ROOT_NAME;

//
// Content
//

const SYNTAX_CONTENT_NAME = 'Syntax.Content';

type SyntaxContentProps = ComposableProps;

/** Flex-column layout container for composite parts. */
const SyntaxContent = composable<HTMLDivElement, SyntaxContentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { classNames: 'flex flex-col h-full min-h-0 overflow-hidden' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

SyntaxContent.displayName = SYNTAX_CONTENT_NAME;

//
// Filter
//

const SYNTAX_FILTER_NAME = 'Syntax.Filter';

type SyntaxFilterProps = ComposableProps<{
  placeholder?: string;
}>;

/** JSONPath filter input. Only meaningful when `Syntax.Root` is in JSON mode. */
const SyntaxFilter = forwardRef<HTMLInputElement, SyntaxFilterProps>(
  ({ classNames, placeholder = 'JSONPath (e.g., $.graph.nodes)' }, forwardedRef) => {
    const { mode, filterText, setFilterText, filterError } = useSyntaxContext(SYNTAX_FILTER_NAME);
    if (mode !== 'json') {
      throw new Error(`\`${SYNTAX_FILTER_NAME}\` requires \`Syntax.Root\` to be in JSON mode (pass \`data\`).`);
    }

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

SyntaxFilter.displayName = SYNTAX_FILTER_NAME;

//
// Viewport
//

const SYNTAX_VIEWPORT_NAME = 'Syntax.Viewport';

type SyntaxViewportProps = ComposableProps;

/** Optional scroll wrapper. Compose around `Syntax.Code` to make it scrollable. */
const SyntaxViewport = composable<HTMLDivElement, SyntaxViewportProps>(({ children, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props)} thin ref={forwardedRef}>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

SyntaxViewport.displayName = SYNTAX_VIEWPORT_NAME;

//
// Code
//

const SYNTAX_CODE_NAME = 'Syntax.Code';

type SyntaxCodeProps = ComposableProps<{
  testId?: string;
}>;

/** Highlighted code leaf. Reads source/data from `Syntax.Root` context. */
const SyntaxCode = composable<HTMLDivElement, SyntaxCodeProps>(({ testId, ...props }, forwardedRef) => {
  const context = useSyntaxContext(SYNTAX_CODE_NAME);
  const merged = composableProps(props, { classNames: 'py-1 px-2 text-sm' });

  if (context.mode === 'json') {
    return (
      <JsonHighlighter
        {...merged}
        data={context.filteredData}
        replacer={context.replacer}
        testId={testId}
        ref={forwardedRef}
      />
    );
  }

  return (
    <SyntaxHighlighter {...merged} language={context.language} data-testid={testId} ref={forwardedRef}>
      {context.source ?? ''}
    </SyntaxHighlighter>
  );
});

SyntaxCode.displayName = SYNTAX_CODE_NAME;

//
// Syntax
//

export const Syntax = {
  Root: SyntaxRoot,
  Content: SyntaxContent,
  Filter: SyntaxFilter,
  Viewport: SyntaxViewport,
  Code: SyntaxCode,
};

export type { SyntaxRootProps, SyntaxContentProps, SyntaxFilterProps, SyntaxViewportProps, SyntaxCodeProps };
