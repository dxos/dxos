//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';

import { ChangelogGraph, type DecisionModel, buildChangelogGraph } from '../ChangelogGraph/index.ts';
import { decisionGutter } from './decision-gutter.ts';

export type SpecChangelogProps = {
  /** The text of a `.mdl` spec. */
  content: string;
};

/**
 * A spec beside its decision graph: the highlighted spec body with a gutter of the decisions attached to each
 * block, and the changelog as a graph. A gutter chip selects its decision's card.
 */
export const SpecChangelog = ({ content }: SpecChangelogProps) => {
  const themeMode = Hooks.useThemeMode();
  const [selected, setSelected] = useState<string>();
  const decisions = useMemo(
    () => buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
    [content],
  );
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineNumbers: true, readOnly: true }),
      createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      decorateMarkdown(),
      mdl(),
      decisionGutter(decisions, setSelected),
    ],
    [themeMode, decisions],
  );

  return (
    <div className='dx-fill grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-separator'>
      <div className='relative overflow-auto' data-testid='spec-changelog.spec'>
        <Editor.Root extensions={extensions}>
          <Editor.View classNames={editorClassNames('article')} value={content} />
        </Editor.Root>
      </div>
      <div className='relative min-h-0'>
        <ChangelogGraph content={content} selected={selected} />
      </div>
    </div>
  );
};
