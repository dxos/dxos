//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createSurface, contributes, Capabilities, useCapability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { MarkdownContainer, MarkdownSettings, MarkdownPreview } from '../components';
import { MARKDOWN_PLUGIN } from '../meta';
import { Markdown, isEditorModel, type MarkdownSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MARKDOWN_PLUGIN}/document`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { subject: Markdown.Document; variant: undefined } =>
        Obj.instanceOf(Markdown.Document, data.subject) && !data.variant,
      component: ({ data, role }) => {
        const selectionManager = useCapability(AttentionCapabilities.Selection);
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);
        const viewMode = getViewMode(fullyQualifiedId(data.subject));

        return (
          <MarkdownContainer
            id={fullyQualifiedId(data.subject)}
            object={data.subject}
            role={role}
            settings={settings}
            selectionManager={selectionManager}
            extensionProviders={state.extensionProviders}
            viewMode={viewMode}
            editorStateStore={editorState}
            onViewModeChange={setViewMode}
          />
        );
      },
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/text`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { id: string; subject: DataType.Text } =>
        typeof data.id === 'string' && Obj.instanceOf(DataType.Text, data.subject),
      component: ({ data, role }) => {
        const selectionManager = useCapability(AttentionCapabilities.Selection);
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);

        return (
          <MarkdownContainer
            id={data.id}
            object={data.subject}
            role={role}
            settings={settings}
            selectionManager={selectionManager}
            extensionProviders={state.extensionProviders}
            viewMode={getViewMode(data.id)}
            editorStateStore={editorState}
            onViewModeChange={setViewMode}
          />
        );
      },
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/editor`,
      role: ['article', 'section'],
      filter: (data): data is { subject: { id: string; text: string } } => isEditorModel(data.subject),
      component: ({ data, role }) => {
        const selectionManager = useCapability(AttentionCapabilities.Selection);
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);

        return (
          <MarkdownContainer
            id={data.subject.id}
            object={data.subject}
            role={role}
            settings={settings}
            selectionManager={selectionManager}
            extensionProviders={state.extensionProviders}
            viewMode={getViewMode(data.subject.id)}
            editorStateStore={editorState}
            onViewModeChange={setViewMode}
          />
        );
      },
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<MarkdownSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === MARKDOWN_PLUGIN,
      component: ({ data: { subject } }) => <MarkdownSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/preview`,
      role: ['card--popover', 'card--intrinsic', 'card--extrinsic', 'card--transclusion', 'card'],
      filter: (data): data is { subject: Markdown.Document | DataType.Text } =>
        Obj.instanceOf(Markdown.Document, data.subject) || Obj.instanceOf(DataType.Text, data.subject),
      component: ({ data, role }) => <MarkdownPreview {...data} role={role} />,
    }),
  ]);
