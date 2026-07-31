//
// Copyright 2025 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { JSONPath } from 'jsonpath-plus';
import React, { type PropsWithChildren, forwardRef, useCallback, useMemo, useState } from 'react';

import { Input, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
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
  // Expansion depth (JSON mode); consumed by a `getReplacer` factory, edited via `Syntax.Depth`.
  depth: number;
  setDepth: (depth: number) => void;
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
  /**
   * Depth-parametrized replacer, re-evaluated as the `Syntax.Depth` control changes. Takes
   * precedence over `replacer`. The consumer owns any domain knowledge (e.g. how depth maps to
   * ref resolution), so this package stays domain-free.
   */
  getReplacer?: (depth: number) => JsonReplacer | undefined;
  /** Initial expansion depth for `Syntax.Depth` / `getReplacer`. */
  defaultDepth?: number;
  /** Notified when the depth changes (via `Syntax.Depth`). */
  onDepthChange?: (depth: number) => void;
}>;

/**
 * Headless context provider. Selects JSON mode when the `data` prop is passed at all — even
 * `data={undefined}` — so loading states render an empty JSON view rather than flipping to
 * text mode (which would trip `Syntax.Filter`'s JSON-only guard). Mode is chosen by prop
 * presence, not value.
 */
const SyntaxRoot = (props: ScopedProps<SyntaxRootProps>) => {
  const { __scopeSyntax, children, language, source, replacer, getReplacer, defaultDepth = 0, onDepthChange } = props;
  const isJson = 'data' in props;
  const data = props.data;
  const [filterText, setFilterText] = useState('');
  const [depth, setDepthState] = useState(defaultDepth);
  const setDepth = useCallback(
    (next: number) => {
      setDepthState(next);
      onDepthChange?.(next);
    },
    [onDepthChange],
  );

  // `getReplacer` (depth-parametrized) takes precedence over the static `replacer`.
  const effectiveReplacer = useMemo(
    () => (getReplacer ? getReplacer(depth) : replacer),
    [getReplacer, replacer, depth],
  );

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
      replacer={effectiveReplacer}
      depth={depth}
      setDepth={setDepth}
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
// Depth
//

const SYNTAX_DEPTH_NAME = 'Syntax.Depth';

type SyntaxDepthProps = ComposableProps;

/**
 * Numeric expansion-depth control bound to `Syntax.Root`'s depth state. Meaningful when the Root is
 * given a `getReplacer` that consumes depth (e.g. to resolve references N levels deep).
 */
const SyntaxDepth = forwardRef<HTMLInputElement, ScopedProps<SyntaxDepthProps>>(
  ({ __scopeSyntax, classNames }, forwardedRef) => {
    const { depth, setDepth } = useSyntaxContext(SYNTAX_DEPTH_NAME, __scopeSyntax);
    return (
      <Input.Root>
        <Input.TextInput
          classNames={['p-1 px-2 font-mono', classNames]}
          variant='subdued'
          type='number'
          min={0}
          step={1}
          aria-label='Depth'
          value={depth}
          onChange={(event) => setDepth(Math.max(0, Number(event.target.value) || 0))}
          ref={forwardedRef}
        />
      </Input.Root>
    );
  },
);

SyntaxDepth.displayName = SYNTAX_DEPTH_NAME;

//
// Viewport
//

const SYNTAX_VIEWPORT_NAME = 'Syntax.Viewport';

type SyntaxViewportProps = ComposableProps;

/** Optional scroll wrapper. Compose around `Syntax.Code` to make it scrollable. */
const SyntaxViewport = composable<HTMLDivElement, SyntaxViewportProps>(({ children, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props)} orientation='all' thin ref={forwardedRef}>
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
  Depth: SyntaxDepth,
  Viewport: SyntaxViewport,
  Code: SyntaxCode,
};

export { createSyntaxScope };

export type {
  SyntaxCodeProps,
  SyntaxContentProps,
  SyntaxDepthProps,
  SyntaxFilterProps,
  SyntaxRootProps,
  SyntaxViewportProps,
};
