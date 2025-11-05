//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MarkdownCard, MarkdownContainer, type MarkdownContainerProps, MarkdownSettings } from '../components';
import { meta } from '../meta';
import { Markdown } from '../types';
import { isEditorModel } from '../util';

import { MarkdownCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/surface/document`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { subject: Markdown.Document; variant: undefined } =>
        Obj.instanceOf(Markdown.Document, data.subject) && !data.variant,
      component: ({ data, role }) => {
        return <Container id={fullyQualifiedId(data.subject)} subject={data.subject} role={role} />;
      },
    }),
    createSurface({
      id: `${meta.id}/surface/text`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { id: string; subject: DataType.Text.Text } =>
        typeof data.id === 'string' && Obj.instanceOf(DataType.Text.Text, data.subject),
      component: ({ data, role }) => {
        return <Container id={data.id} subject={data.subject} role={role} />;
      },
    }),
    // TODO(burdon): Remove this variant and conform to DataType.Text.
    createSurface({
      id: `${meta.id}/surface/editor`,
      role: ['article', 'section'],
      filter: (data): data is { subject: { id: string; text: string } } => isEditorModel(data.subject),
      component: ({ data, role }) => {
        return <Container id={data.subject.id} subject={data.subject} role={role} />;
      },
    }),
    createSurface({
      id: `${meta.id}/surface/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<Markdown.Settings> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <MarkdownSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/surface/preview`,
      role: ['card--popover', 'card--intrinsic', 'card--extrinsic', 'card--transclusion', 'card'],
      filter: (data): data is { subject: Markdown.Document | DataType.Text.Text } =>
        Obj.instanceOf(Markdown.Document, data.subject) || Obj.instanceOf(DataType.Text.Text, data.subject),
      component: ({ data, role }) => <MarkdownCard {...data} role={role} />,
    }),
  ]);

/**
 * Common wrapper.
 */
const Container = ({ id, subject, role }: { id: string; subject: MarkdownContainerProps['object']; role: string }) => {
  const selectionManager = useCapability(AttentionCapabilities.Selection);
  const settingsStore = useCapability(Capabilities.SettingsStore);
  const settings = settingsStore.getStore<Markdown.Settings>(meta.id)!.value;
  const { state, editorState, getViewMode, setViewMode } = useCapability(MarkdownCapabilities.State);
  const viewMode = getViewMode(id);
  const handleViewModeChange = useCallback<NonNullable<MarkdownContainerProps['onViewModeChange']>>(
    (mode) => setViewMode(id, mode),
    [id, setViewMode],
  );

  return (
    <MarkdownContainer
      id={id}
      object={subject}
      role={role}
      settings={settings}
      selectionManager={selectionManager}
      extensionProviders={state.extensionProviders}
      editorStateStore={editorState}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  );
};
