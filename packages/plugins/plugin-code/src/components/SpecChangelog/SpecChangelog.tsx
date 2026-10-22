//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { diagramBlockDescription, diagramPreview } from '@dxos/diagram/extension';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';

import { meta } from '#meta';

import { ApiSurface } from '../ApiSurface/index.ts';
import { ChangelogGraph, type DecisionModel, buildChangelogGraph } from '../ChangelogGraph/index.ts';
import { DataModelGraph } from '../DataModelGraph/index.ts';
import { DecisionLog } from '../DecisionLog/index.ts';
import { DefinitionGraph } from '../DefinitionGraph/index.ts';
import { decisionGutter } from './decision-gutter.ts';

/** What the panel beside the spec shows. */
export const SPEC_VIEWS = ['decisions', 'log', 'definitions', 'data', 'api'] as const;

export type SpecView = (typeof SPEC_VIEWS)[number];

const VIEW_ICON: Record<SpecView, string> = {
  decisions: 'ph--graph--regular',
  log: 'ph--users-three--regular',
  definitions: 'ph--tree-structure--regular',
  data: 'ph--database--regular',
  api: 'ph--plugs-connected--regular',
};

const isSpecView = (value: string): value is SpecView => (SPEC_VIEWS as readonly string[]).includes(value);

export type SpecChangelogProps = {
  /** The text of a `.mdl` spec. */
  content: string;
  /** The view the panel opens on; the decision graph by default. */
  defaultView?: SpecView;
};

/**
 * A spec beside a panel of views of it: the highlighted spec body with a gutter of the decisions attached to
 * each block, and a toolbar that switches the panel between the decision graph, the decision log by person,
 * the graph of definitions, the stored data model and the API. A gutter chip selects its decision.
 */
export const SpecChangelog = ({ content, defaultView = 'decisions' }: SpecChangelogProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const themeMode = Hooks.useThemeMode();
  const [view, setView] = useState<SpecView>(defaultView);
  const [selected, setSelected] = useState<string>();
  const decisions = useMemo(
    () => buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
    [content],
  );
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineNumbers: true, readOnly: true }),
      createMarkdownExtensions({ codeLanguages: [mdlBlockDescription, diagramBlockDescription] }),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      decorateMarkdown(),
      mdl(),
      diagramPreview(),
      decisionGutter(decisions, (id) => {
        setSelected(id);
        // A gutter chip is about a decision, so it brings back a view that shows decisions.
        setView((current) => (current === 'decisions' || current === 'log' ? current : 'decisions'));
      }),
    ],
    [themeMode, decisions],
  );

  return (
    <Layout.Grid cols={['fill', 'fill']} grow classNames='divide-x divide-separator'>
      {/* Scrolls the read-only editor, which sizes to its content. */}
      <div className='relative overflow-auto' data-testid='spec-changelog.spec'>
        <Editor.Root extensions={extensions}>
          <Editor.View classNames={editorClassNames('article')} value={content} />
        </Editor.Root>
      </div>
      <Panel.Root>
        <Panel.Header>
          <Toolbar.Root>
            <Toolbar.ToggleGroup
              type='single'
              value={view}
              onValueChange={(value) => isSpecView(value) && setView(value)}
              aria-label={t('spec-view.label')}
            >
              {SPEC_VIEWS.map((value) => (
                <ToggleGroup.Item
                  key={value}
                  value={value}
                  icon={VIEW_ICON[value]}
                  label={t(`spec-view.${value}.label`)}
                  data-testid={`spec-changelog.view.${value}`}
                />
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body classNames='relative' data-testid='spec-changelog.panel' data-view={view}>
          {view === 'decisions' && <ChangelogGraph content={content} selected={selected} />}
          {view === 'log' && <DecisionLog content={content} selected={selected} />}
          {view === 'definitions' && <DefinitionGraph content={content} />}
          {view === 'data' && <DataModelGraph content={content} />}
          {view === 'api' && <ApiSurface content={content} />}
        </Panel.Body>
      </Panel.Root>
    </Layout.Grid>
  );
};
