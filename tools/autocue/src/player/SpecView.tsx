//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useEffect, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Spec } from './types.ts';

export type SpecViewProps = {
  spec: Spec;
  /** The chapter under the playhead; the step recorded as it is highlighted. */
  current: number;
  onSelect: (chapter: number) => void;
};

/** `  - name: Play 1. e4  # note` → indent, list marker, key, value, comment, so each can be coloured. */
const LINE = /^(\s*)(- )?([A-Za-z][\w-]*:)?(.*?)(\s+#.*)?$/;

/** Columns before a line's text, counting a list marker as indent. */
const indentOf = (text: string) => text.match(/^\s*(- )?/)?.[0].length ?? 0;

/** One source line with the `.mdl` structure picked out: keys, the test header, and trailing comments. */
const SourceLine = ({ text, header }: { text: string; header?: boolean }) => {
  if (header) {
    return <span className='font-semibold text-fg'>{text}</span>;
  }
  const [, indent = '', marker = '', key = '', value = '', comment = ''] = text.match(LINE) ?? [];
  return (
    <>
      {indent}
      {marker && <span className='text-fg-subtle'>{marker}</span>}
      {key && <span className='text-accent-text'>{key}</span>}
      <span className={key === 'name:' ? 'font-semibold text-fg' : undefined}>{value}</span>
      {comment && <span className='text-fg-subtle'>{comment}</span>}
    </>
  );
};

/**
 * The `.mdl` test the take was written from, as its source. Each step's lines are one block; a step the take
 * recorded is a button that seeks to its chapter, and the step under the playhead is highlighted. Steps the take did
 * not record (a `before` or `after` step, a human-only step) stay as text.
 */
export const SpecView = ({ spec, current, onSelect }: SpecViewProps) => {
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Recent Chromium returns a promise here, which React would take for a cleanup function.
    void currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const blocks: ReactNode[] = [];
  let line = 0;
  const lineNumber = (index: number) => (
    <span aria-hidden className='inline-block w-8 shrink-0 select-none pe-2 text-end text-fg-subtle tabular-nums'>
      {spec.line + index}
    </span>
  );
  const renderLines = (from: number, to: number) =>
    spec.lines.slice(from, to + 1).map((text, offset) => (
      <span key={from + offset} className='flex'>
        {lineNumber(from + offset)}
        {/* A hanging indent, so a wrapped line continues under its own text rather than at the margin. */}
        <span
          className='min-w-0 whitespace-pre-wrap break-words'
          style={{ paddingInlineStart: `${indentOf(text)}ch`, textIndent: `-${indentOf(text)}ch` }}
        >
          <SourceLine text={text} header={from + offset === 0} />
        </span>
      </span>
    ));

  for (const step of spec.steps) {
    if (line < step.start) {
      blocks.push(
        <div key={`text-${line}`} className='px-2'>
          {renderLines(line, step.start - 1)}
        </div>,
      );
    }
    const recorded = step.chapter !== undefined;
    const isCurrent = recorded && step.chapter === current;
    blocks.push(
      recorded ? (
        <button
          key={`step-${step.start}`}
          type='button'
          ref={isCurrent ? currentRef : undefined}
          aria-current={isCurrent ? 'step' : undefined}
          title={`Jump to chapter ${(step.chapter ?? 0) + 1}`}
          onClick={() => step.chapter !== undefined && onSelect(step.chapter)}
          className={mx(
            'block w-full cursor-pointer rounded-sm border-s-2 border-transparent px-2 py-0.5 text-start dx-focus-ring',
            'hover:bg-hover-surface',
            isCurrent && 'border-accent-text bg-current-surface hover:bg-current-surface-hover',
          )}
        >
          {renderLines(step.start, step.end)}
        </button>
      ) : (
        <div key={`step-${step.start}`} className='border-s-2 border-transparent px-2 py-0.5 opacity-70'>
          {renderLines(step.start, step.end)}
        </div>
      ),
    );
    line = step.end + 1;
  }
  if (line < spec.lines.length) {
    blocks.push(
      <div key={`text-${line}`} className='px-2'>
        {renderLines(line, spec.lines.length - 1)}
      </div>,
    );
  }

  return (
    <div role='document' aria-label={`${spec.path} test ${spec.test}`} className='py-2 font-mono text-xs leading-5'>
      {blocks}
    </div>
  );
};
