//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createSurface, contributes, Capabilities, useCapability } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { SettingsStore } from '@dxos/local-storage';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { TextType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { MarkdownContainer, MarkdownSettings } from '../components';
import { MARKDOWN_PLUGIN } from '../meta';
import { DocumentType, isEditorModel, type MarkdownSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MARKDOWN_PLUGIN}/document`,
      role: ['article', 'section'],
      filter: (data): data is { subject: DocumentType } => isInstanceOf(DocumentType, data.subject),
      component: ({ data, role }) => {
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);

        return (
          <MarkdownContainer
            id={fullyQualifiedId(data.subject)}
            object={data.subject}
            role={role}
            settings={settings}
            extensionProviders={state.extensionProviders}
            viewMode={getViewMode(fullyQualifiedId(data.subject))}
            editorStateStore={editorState}
            onViewModeChange={setViewMode}
          />
        );
      },
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/text`,
      role: ['article', 'section'],
      filter: (data): data is { id: string; subject: TextType } =>
        typeof data.id === 'string' && isInstanceOf(TextType, data.subject),
      component: ({ data, role }) => {
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);

        return (
          <MarkdownContainer
            id={data.id}
            object={data.subject}
            role={role}
            settings={settings}
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
        const settingsStore = useCapability(Capabilities.SettingsStore);
        const settings = settingsStore.getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;
        const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);

        return (
          <MarkdownContainer
            id={data.subject.id}
            object={data.subject}
            role={role}
            settings={settings}
            extensionProviders={state.extensionProviders}
            viewMode={getViewMode(data.subject.id)}
            editorStateStore={editorState}
            onViewModeChange={setViewMode}
          />
        );
      },
    }),
    createSurface({
      id: `${MARKDOWN_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<MarkdownSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === MARKDOWN_PLUGIN,
      component: ({ data: { subject } }) => <MarkdownSettings settings={subject.value} />,
    }),
  ]);
