//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { SurfaceCardRole, useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Text } from '@dxos/schema';

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
      component: ({ ref, data, role }) => {
        return <Container ref={ref} id={Obj.getDXN(data.subject).toString()} subject={data.subject} role={role} />;
      },
    }),
    createSurface({
      id: `${meta.id}/surface/text`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { id: string; subject: Text.Text } =>
        typeof data.id === 'string' && Obj.instanceOf(Text.Text, data.subject),
      component: ({ data, role }) => {
        return <Container id={data.id} subject={data.subject} role={role} />;
      },
    }),
    // TODO(burdon): Remove this variant and conform to Text.
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
      role: SurfaceCardRole.literals as any,
      filter: (data): data is { subject: Markdown.Document | Text.Text } =>
        Obj.instanceOf(Markdown.Document, data.subject) || Obj.instanceOf(Text.Text, data.subject),
      component: ({ data, role }) => <MarkdownCard {...data} role={role as SurfaceCardRole} />,
    }),
  ]);

/**
 * Common wrapper.
 */
// TOOD(burdon): Use common type def.
const Container = forwardRef<HTMLElement, { id: string; subject: MarkdownContainerProps['object']; role: string }>(
  ({ id, subject, role }, forwardedRef) => {
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
        ref={forwardedRef}
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
  },
);
