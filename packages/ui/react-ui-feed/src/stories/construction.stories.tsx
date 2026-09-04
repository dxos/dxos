//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { type ConstructionCase, type ConstructionResult, profileConstruction } from '../components/Block/construction';
import { createBlockExtensions } from '../components/Block/extensions';
import { chatRegistry } from '../testing/widgets';

/** The uniform ladder's document: one short paragraph, one line at the story's width. */
const SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.';

/** What an answer actually looks like: a bolded lead, a paragraph, a list. */
const LONG = [
  '**Lead.** Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
  '',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo',
  'consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
  '',
  '- Excepteur sint occaecat cupidatat non proident.',
  '- Sunt in culpa qui officia deserunt mollit anim id est laborum.',
].join('\n');

/**
 * Cumulative: each case is the one above it plus one thing, so the difference between two rows is
 * the cost of exactly what was added.
 */
const buildCases = (): ConstructionCase[] => [
  {
    name: 'wrapping only',
    extensions: [EditorView.editable.of(false), EditorState.readOnly.of(true), EditorView.lineWrapping],
  },
  {
    name: '+ theme',
    extensions: [
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      EditorView.lineWrapping,
      createThemeExtensions({ themeMode: 'light' }),
    ],
  },
  {
    name: '+ basic',
    extensions: [
      createBasicExtensions({ readOnly: true, editable: false, lineWrapping: true }),
      createThemeExtensions({ themeMode: 'light' }),
    ],
  },
  {
    name: '+ markdown',
    extensions: [
      createBasicExtensions({ readOnly: true, editable: false, lineWrapping: true }),
      createThemeExtensions({ themeMode: 'light' }),
      createMarkdownExtensions(),
    ],
  },
  {
    name: '+ decorate (= item)',
    extensions: [
      createBasicExtensions({ readOnly: true, editable: false, lineWrapping: true }),
      createThemeExtensions({ themeMode: 'light' }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ] as Extension[],
  },
  { name: 'item', extensions: createBlockExtensions() },
  { name: 'item + registry', extensions: createBlockExtensions({ registry: chatRegistry }) },
];

type Row = ConstructionResult & { doc: string };

const ConstructionProfile = ({ runs = 20 }: { runs?: number }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    const measured = (['short', 'long'] as const).flatMap((doc) =>
      profileConstruction({ parent, cases: buildCases(), doc: doc === 'short' ? SHORT : LONG, runs }).map((result) => ({
        ...result,
        doc,
      })),
    );

    setRows(measured);
    // eslint-disable-next-line no-console
    console.log('[item construction]\n' + format(measured));
  }, [runs]);

  return (
    <div className='p-4 flex flex-col gap-4'>
      {/* Offscreen but laid out: a `display:none` parent has no layout, and the layout is the cost. */}
      <div ref={parentRef} className='absolute -top-[10000px] w-[46rem]' aria-hidden />
      <pre className='text-xs whitespace-pre'>{rows.length ? format(rows) : 'measuring…'}</pre>
    </div>
  );
};

const format = (rows: Row[]): string => {
  const header = ['doc', 'case', 'mean ms', 'worst ms', '×22 rows'];
  const body = rows.map(({ doc, name, mean, worst }) => [
    doc,
    name,
    mean.toFixed(2),
    worst.toFixed(2),
    (mean * 22).toFixed(0),
  ]);
  const widths = header.map((_, column) => Math.max(...[header, ...body].map((row) => row[column].length)));

  return [header, ...body].map((row) => row.map((cell, column) => cell.padEnd(widths[column])).join('  ')).join('\n');
};

const meta: Meta<typeof ConstructionProfile> = {
  title: 'ui/react-ui-feed/stories/construction',
  component: ConstructionProfile,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof ConstructionProfile>;

/**
 * How long one item takes to build, by extension set.
 *
 * The first fill mounts a viewport of rows in one go, so the `×22 rows` column is the wall-clock
 * cost of that fill — the number to compare against the >1s `baseline/Uniform` takes to appear.
 * Read it from the story, or from the `[item construction]` line the storybook test run prints.
 */
export const Default: Story = {};
