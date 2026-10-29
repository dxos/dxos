//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Spec } from './types.ts';

export type SpecViewProps = {
  spec: Spec;
  /** The chapter under the playhead (-1 for the intro); the block recorded as it is highlighted. */
  current: number;
  /** Seeks to a chapter; -1 seeks to the start. */
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

/** One clickable span of the source: the intro (header and `given:`) or a step. */
type Block = { key: string; from: number; to: number; chapter?: number };

/**
 * The `.mdl` test the take was written from, as its source. The intro (the header, `given:` and everything before the
 * first step) and each step are blocks marked by a rule in the margin; a block the take recorded is a button that seeks
 * to its chapter (the intro to the start), and the one under the playhead is highlighted. Steps the take did not record
 * (an `after` step, a human-only one) stay as dimmed text.
 */
export const SpecView = ({ spec, current, onSelect }: SpecViewProps) => {
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Recent Chromium returns a promise here, which React would take for a cleanup function.
    void currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [current]);

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

  const firstStep = spec.steps[0]?.start ?? spec.lines.length;
  const blocks: Block[] = [{ key: 'intro', from: 0, to: firstStep - 1, chapter: -1 }];
  spec.steps.forEach((step, index) => {
    const next = spec.steps[index + 1]?.start ?? spec.lines.length;
    // Lines between two steps (`after:`) belong to the step before them.
    blocks.push({ key: `step-${step.start}`, from: step.start, to: next - 1, chapter: step.chapter });
  });

  return (
    <div
      role='document'
      aria-label={`${spec.path} test ${spec.test}`}
      className='flex flex-col gap-1 py-2 font-mono text-xs leading-5'
    >
      {blocks
        .filter((block) => block.to >= block.from)
        .map((block) => {
          const recorded = block.chapter !== undefined;
          const isCurrent = recorded && block.chapter === current;
          const classNames = mx(
            'block w-full border-s-2 px-2 py-0.5 text-start',
            isCurrent ? 'border-accent-text bg-current-surface' : 'border-separator',
          );
          return recorded ? (
            <button
              key={block.key}
              type='button'
              ref={isCurrent ? currentRef : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              title={block.chapter === -1 ? 'Jump to the start' : `Jump to chapter ${(block.chapter ?? 0) + 1}`}
              onClick={() => block.chapter !== undefined && onSelect(block.chapter)}
              className={mx(
                classNames,
                'cursor-pointer dx-focus-ring',
                isCurrent ? 'hover:bg-current-surface-hover' : 'hover:border-fg-subtle hover:bg-hover-surface',
              )}
            >
              {renderLines(block.from, block.to)}
            </button>
          ) : (
            <div key={block.key} className={mx(classNames, 'border-separator-subtle opacity-60')}>
              {renderLines(block.from, block.to)}
            </div>
          );
        })}
    </div>
  );
};
