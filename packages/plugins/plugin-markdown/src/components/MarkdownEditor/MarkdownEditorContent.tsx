//
// Copyright 2023 DXOS.org
//

import { Compartment } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  type EditorToolbarState,
  type UseTextEditorProps,
  useTextEditor,
} from '@dxos/react-ui-editor';
import {
  type EditorSelectionState,
  type EditorStateStore,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentSlots,
  dropFile,
  editorClassNames,
  formattingListener,
  mobileSlots,
  processEditorPayload,
  scrollbarAutohide,
} from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { meta } from '#meta';

import { type MarkdownEditorToolbarProps } from './MarkdownEditorToolbar.tsx';

export type MarkdownEditorContentProps = ThemedClassName<{
  id: string;
  attendableId?: string;
  role?: string;
  compact?: boolean;
  viewMode?: EditorViewMode;
  slashCommandGroups?: EditorMenuGroup[];
  editorStateStore?: EditorStateStore;
  toolbarState?: Atom.Writable<EditorToolbarState>;
  onLinkQuery?: (query?: string) => Promise<EditorMenuGroup[]>;
}> &
  Pick<UseTextEditorProps, 'initialValue' | 'extensions'> &
  Pick<MarkdownEditorToolbarProps, 'onFileUpload'> &
  Pick<ThemeExtensionsOptions, 'slots'>;

// TODO(burdon): Move controller to Root.
// One compartment per module is safe: compartments are keyed per EditorState, so concurrent editors
// reconfigure independently.
const dynamicCompartment = new Compartment();

export const MarkdownEditorContent = forwardRef<EditorView | null, MarkdownEditorContentProps>(
  (
    {
      classNames,
      id,
      role,
      compact,
      viewMode,
      initialValue,
      editorStateStore,
      toolbarState,
      extensions,
      slots,
      onFileUpload,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);
    const { themeMode } = useThemeContext();
    const registry = useContext(RegistryContext);

    // Callback to update toolbar state atom.
    const updateToolbarState = useCallback(
      (formatting: EditorToolbarState) => {
        if (toolbarState) {
          registry.set(toolbarState, { ...registry.get(toolbarState), ...formatting });
        }
      },
      [registry, toolbarState],
    );

    // Restore last selection and scroll point.
    // Keyed to the editor's lifecycle (`id`), matching `useTextEditor`'s own props memo: a value
    // read on a later render would never reach the view, which is only recreated when `id` changes.
    const { scrollTo, scrollOffset, selection } = useMemo<EditorSelectionState>(
      () => editorStateStore?.getState(id) ?? {},
      [id],
    );

    // Everything that varies per render — view mode, theme, the binding's extensions — lives in one
    // compartment and is RECONFIGURED on the live view below. Recreating the view on these deps was
    // the teardown behind every mode-switch discontinuity (flicker, caret and focus loss, overlay
    // geometry churn): CodeMirror reconfigures in place; only a different surface (`id`) recreates.
    const dynamicExtensions = useCallback(
      () =>
        [
          createBasicExtensions({
            readOnly: viewMode === 'readonly',
            placeholder: t('editor.placeholder'),
            scrollPastEnd: !compact,
            search: true,
          }),
          createThemeExtensions({
            themeMode,
            slots: slots ?? (compact ? mobileSlots : documentSlots),
            syntaxHighlighting: true,
          }),
          createMarkdownExtensions(),
          scrollbarAutohide(),
          toolbarState && formattingListener(updateToolbarState),
          role !== AppSurface.Section.role &&
            onFileUpload &&
            dropFile({
              // TODO(wittjosiah): Factor out to file uploader plugin.
              onDrop: async (view, { files }) => {
                const file = files[0];
                const info = file && onFileUpload ? await onFileUpload(file) : undefined;
                if (info) {
                  processEditorPayload(view, { type: 'image', data: info.url });
                }
              },
            }),
          extensions,
        ].filter(isTruthy),
      [viewMode, themeMode, extensions, compact, slots, role, toolbarState, updateToolbarState, onFileUpload, t],
    );

    const {
      parentRef,
      view: editorView,
      focusAttributes,
    } = useTextEditor(
      () => ({
        ...(role !== AppSurface.Section.role && {
          id,
          scrollTo,
          scrollOffset,
          selection,
          selectionEnd: true,
        }),
        initialValue,
        extensions: dynamicCompartment.of(dynamicExtensions()),
      }),
      [id],
    );

    // Reconfigure the live view when any dynamic input changes — never recreate it.
    useEffect(() => {
      if (editorView) {
        editorView.dispatch({ effects: dynamicCompartment.reconfigure(dynamicExtensions()) });
      }
    }, [editorView, dynamicExtensions]);

    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => editorView, [editorView]);

    useTest(editorView);

    return (
      <div
        {...focusAttributes}
        className={mx(editorClassNames(role), classNames)}
        data-testid='composer.markdownRoot'
        data-popover-collision-boundary={true}
        ref={parentRef}
      />
    );
  },
);

// Expose editor view for playwright tests.
// TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
const useTest = (view: EditorView | null) => {
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = view;
    }
  }, [view]);
};
