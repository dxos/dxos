//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { type SourceKey, formatSourceKey, parseSourceKey } from '#sync';

import { type Snippet, declarationSnippet } from '../CodeView/symbol.ts';
import { type SourceReader } from '../SpecEditor/snippet-card.ts';
import { mountSnippet } from '../SpecEditor/snippet-view.ts';
import { type WalkthroughStep } from '../SpecModel/index.ts';

export type WalkthroughProps = {
  steps: readonly WalkthroughStep[];
  /** The checkout's text of a file; without it a step shows its file name only. */
  read?: SourceReader;
  onOpenCode?: (key: SourceKey) => void;
};

/** Where an item is implemented: each step's sentence above the declaration it names, linked to its file. */
export const Walkthrough = ({ steps, read, onOpenCode }: WalkthroughProps) => (
  <Layout.Flex column gap='sm' data-testid='verdict-card.walkthrough'>
    {steps.map((step, index) => (
      <WalkthroughSegment key={`${index}-${step.key}`} index={index} step={step} read={read} onOpenCode={onOpenCode} />
    ))}
  </Layout.Flex>
);

type WalkthroughSegmentProps = Omit<WalkthroughProps, 'steps'> & { index: number; step: WalkthroughStep };

const WalkthroughSegment = ({ index, step, read, onOpenCode }: WalkthroughSegmentProps) => {
  const key = useMemo(() => parseSourceKey(step.key), [step.key]);
  const text = key && read?.(key);
  const snippet = useMemo(() => (text ? declarationSnippet(text, key?.fragment) : undefined), [text, key]);
  if (!key) {
    return null;
  }

  return (
    <Layout.Flex column gap='xs' data-testid='verdict-card.walkthrough-step'>
      {step.text && (
        <p className='text-sm'>
          {index + 1}. {step.text}.
        </p>
      )}
      <button
        type='button'
        className='self-start text-start break-all font-mono text-xs text-description hover:underline'
        title={formatSourceKey(key)}
        disabled={!onOpenCode}
        onClick={(event) => {
          // The card's own click selects it; the file link opens code instead.
          event.stopPropagation();
          onOpenCode?.(key);
        }}
      >
        {key.path}
        {key.fragment && `#${key.fragment}`}
      </button>
      {snippet && <SnippetCode snippet={snippet} path={key.path} />}
    </Layout.Flex>
  );
};

/** A highlighted, read-only code view of one snippet, in the palette of the current theme. */
const SnippetCode = ({ snippet, path }: { snippet: Snippet; path: string }) => {
  const themeMode = Hooks.useThemeMode();
  const parentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!parentRef.current) {
      return;
    }
    const view = mountSnippet(parentRef.current, snippet, path, themeMode === 'dark');
    return () => view.destroy();
  }, [snippet, path, themeMode]);

  return <div ref={parentRef} className='overflow-x-auto' data-testid='spec-review.snippet' />;
};
