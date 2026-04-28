//
// Copyright 2025 DXOS.org
//

import { createContextScope, type Scope } from '@radix-ui/react-context';
import { JSONPath } from 'jsonpath-plus';
import React, { type FC, type PropsWithChildren, forwardRef, useMemo, useState } from 'react';

import { Input, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { JsonHighlighter, type JsonReplacer } from '../JsonHighlighter';
import { SyntaxHighlighter } from '../SyntaxHighlighter';

//
// Context
//

const SYNTAX_NAME = 'Syntax';

type SyntaxContextValue = {
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

type ScopedProps<P> = P & { __scopeSyntax?: Scope };

const [createSyntaxContext, createSyntaxScope] = createContextScope(SYNTAX_NAME);
const [SyntaxProvider, useSyntaxContext] = createSyntaxContext<SyntaxContextValue>(SYNTAX_NAME);

//
// Root
//

const SYNTAX_ROOT_NAME = 'Syntax.Root';

type SyntaxRootProps = PropsWithChildren<{
  // Text mode.
  language?: string;
  source?: string;
  // JSON mode (presence of the `data` prop selects JSON mode; `undefined` is still JSON).
  data?: any;
  /**
   * `JSON.stringify` replacer applied to `data`. Use the function form to follow domain
   * references (e.g. ECHO refs) by returning a transformed value at the root call. Keeps
   * this package free of any domain-specific knowledge.
   */
  replacer?: JsonReplacer;
}>;

/**
 * Headless context provider. Selects JSON mode when the `data` prop is passed at all — even
 * `data={undefined}` — so loading states render an empty JSON view rather than flipping to
 * text mode (which would trip `Syntax.Filter`'s JSON-only guard). Mode is chosen by prop
 * presence, not value.
 */
const SyntaxRoot: FC<ScopedProps<SyntaxRootProps>> = (props) => {
  const { __scopeSyntax, children, language, source, replacer } = props;
  const isJson = 'data' in props;
  const data = props.data;
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

  return (
    <SyntaxProvider
      scope={__scopeSyntax}
      mode={isJson ? 'json' : 'text'}
      source={source}
      language={language}
      data={data}
      filteredData={filteredData}
      filterText={filterText}
      setFilterText={setFilterText}
      filterError={filterError}
      replacer={replacer}
    >
      {children}
    </SyntaxProvider>
  );
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
const SyntaxFilter = forwardRef<HTMLInputElement, ScopedProps<SyntaxFilterProps>>(
  ({ __scopeSyntax, classNames, placeholder = 'JSONPath (e.g., $.graph.nodes)' }, forwardedRef) => {
    const { mode, filterText, setFilterText, filterError } = useSyntaxContext(SYNTAX_FILTER_NAME, __scopeSyntax);
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
const SyntaxCode = composable<HTMLDivElement, ScopedProps<SyntaxCodeProps>>(
  ({ __scopeSyntax, testId, ...props }, forwardedRef) => {
    const context = useSyntaxContext(SYNTAX_CODE_NAME, __scopeSyntax);
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
  },
);

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

export { createSyntaxScope };

export type { SyntaxRootProps, SyntaxContentProps, SyntaxFilterProps, SyntaxViewportProps, SyntaxCodeProps };
