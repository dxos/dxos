//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Layout from '@dxos/react-ui/Layout';

import { type SourceKey, formatSourceKey, parseSourceKey } from '#sync';

import { declarationSnippet } from '../CodeView/symbol.ts';
import { type SourceReader } from '../SpecEditor/snippet-card.ts';
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
        className='self-start font-mono text-xs text-description hover:underline'
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
      {snippet && (
        <pre className='overflow-x-auto text-xs leading-5 font-mono' data-testid='spec-review.snippet'>
          {snippet.lines.map((line, offset) => (
            <div key={offset} className='flex'>
              <span className='w-8 shrink-0 pe-2 text-end text-description select-none'>{snippet.line + offset}</span>
              <span className='whitespace-pre'>{line}</span>
            </div>
          ))}
          {snippet.truncated && <div className='ps-8 text-description'>…</div>}
        </pre>
      )}
    </Layout.Flex>
  );
};
