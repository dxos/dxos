//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useAtomCapability, useAtomCapabilityState, useCapability, useSettingsState } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor';

import { MarkdownCard, MarkdownContainer, type MarkdownContainerProps, MarkdownSettings } from '../../components';
import { meta } from '../../meta';
import { Markdown, MarkdownCapabilities } from '../../types';
import { isEditorModel } from '../../util';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/surface/document`,
        role: ['article', 'section', 'tabpanel'],
        filter: (data): data is { subject: Markdown.Document; variant: undefined } =>
          Obj.instanceOf(Markdown.Document, data.subject) && !data.variant,
        component: ({ data, role, ref }) => {
          return <Container id={Obj.getDXN(data.subject).toString()} subject={data.subject} role={role} ref={ref} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/surface/text`,
        role: ['article', 'section', 'tabpanel'],
        filter: (data): data is { id: string; subject: Text.Text } =>
          typeof data.id === 'string' && Obj.instanceOf(Text.Text, data.subject),
        component: ({ data, role }) => {
          return <Container id={data.id} subject={data.subject} role={role} />;
        },
      }),
      // TODO(burdon): Remove this variant and conform to Text.
      Common.createSurface({
        id: `${meta.id}/surface/editor`,
        role: ['article', 'section'],
        filter: (data): data is { subject: { id: string; text: string } } => isEditorModel(data.subject),
        component: ({ data, role }) => {
          return <Container id={data.subject.id} subject={data.subject} role={role} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/surface/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Markdown.Settings>(subject.atom);
          return <MarkdownSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/surface/preview`,
        role: 'card--content',
        filter: (data): data is { subject: Markdown.Document | Text.Text } =>
          Obj.instanceOf(Markdown.Document, data.subject) || Obj.instanceOf(Text.Text, data.subject),
        component: ({ data, ref }) => <MarkdownCard {...data} ref={ref} />,
      }),
    ]),
  ),
);

/**
 * Common wrapper.
 */
// TOOD(burdon): Use common type def.
const Container = forwardRef<HTMLDivElement, { id: string; subject: MarkdownContainerProps['object']; role: string }>(
  ({ id, subject, role }, forwardedRef) => {
    const selectionManager = useCapability(AttentionCapabilities.Selection);
    const settings = useAtomCapability(MarkdownCapabilities.Settings);
    const [state, setState] = useAtomCapabilityState(MarkdownCapabilities.State);
    const editorState = useCapability(MarkdownCapabilities.EditorState);
    const extensions = useCapability(MarkdownCapabilities.Extensions);
    const extensionProviders = useMemo(() => extensions.flat(), [extensions]);

    const viewMode: EditorViewMode = (id && state.viewMode[id]) || settings?.defaultViewMode || 'source';
    const handleViewModeChange = useCallback<NonNullable<MarkdownContainerProps['onViewModeChange']>>(
      (mode) => setState((current) => ({ ...current, viewMode: { ...current.viewMode, [id]: mode } })),
      [id, setState],
    );

    return (
      <MarkdownContainer
        id={id}
        object={subject}
        role={role}
        settings={settings}
        selectionManager={selectionManager}
        extensionProviders={extensionProviders}
        editorStateStore={editorState}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        ref={forwardedRef}
      />
    );
  },
);
