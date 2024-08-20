//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect } from 'react';

import { parseAttentionPlugin } from '@braneframe/plugin-attention';
import {
  LayoutAction,
  useResolvePlugin,
  useIntentResolver,
  parseLayoutPlugin,
  type FileInfo,
} from '@dxos/app-framework';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type DNDOptions,
  type UseTextEditorProps,
  Toolbar,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorFillLayoutRoot,
  editorFillLayoutEditor,
  scrollThreadIntoView,
  useActionHandler,
  useFormattingState,
  processAction,
  useCommentState,
  useCommentClickListener,
  type EditorViewMode,
  type Action,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MARKDOWN_PLUGIN } from '../meta';

// Expose editor view for playwright tests.
// TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
const useTest = (view?: EditorView) => {
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = view;
    }
  }, [view]);
};

export type EditorMainProps = {
  id: string;
  viewMode?: EditorViewMode;
  toolbar?: boolean;
  onViewModeChange?: (mode: EditorViewMode) => void;
  onCommentSelect?: (id: string) => void;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<UseTextEditorProps, 'initialValue' | 'selection' | 'scrollTo' | 'extensions'>;

// TODO(wittjosiah): Factor out main styles, reuse for all markdown editors, rename to MarkdownEditor.
export const EditorMain = ({
  id,
  initialValue,
  onFileUpload,
  viewMode = 'preview',
  toolbar,
  scrollTo,
  selection,
  extensions: _extensions,
  onCommentSelect,
  onViewModeChange,
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const attentionPlugin = useResolvePlugin(parseAttentionPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const attended = Array.from(attentionPlugin?.provides.attention?.attended ?? []);
  const isDirectlyAttended = attended.length === 1 && attended[0] === id;

  const [formattingState, formattingObserver] = useFormattingState();

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const commentClickObserver = useCommentClickListener((id) => {
    onCommentSelect?.(id);
  });

  const extensions = useMemo(() => {
    return [
      _extensions,
      onFileUpload && dropFile({ onDrop: handleDrop }),
      formattingObserver,
      commentObserver,
      commentClickObserver,
      createBasicExtensions({
        readonly: viewMode === 'readonly',
        placeholder: t('editor placeholder'),
        scrollPastEnd: true,
      }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({
        themeMode,
        slots: {
          editor: { className: editorFillLayoutEditor },
          content: {
            // TODO(burdon): Overrides (!) are required since the built-in base theme sets padding and scrollPastEnd sets bottom.
            className: mx('!pli-2 sm:!pli-6 md:!pli-8 !pbs-2 sm:!pbs-6 md:!pbs-8'),
          },
        },
      }),
    ].filter(nonNullable);
  }, [_extensions, formattingObserver, viewMode, themeMode]);

  const {
    parentRef,
    view: editorView,
    focusAttributes,
  } = useTextEditor(
    () => ({
      id,
      initialValue,
      extensions,
      selection,
      scrollTo,
      autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
      moveToEndOfLine: true,
    }),
    [id, extensions],
  );

  useTest(editorView);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        if (editorView) {
          // TODO(Zan): Try catch this. Fails when thread plugin not present?
          scrollThreadIntoView(editorView, data?.id);
          if (data?.id === id) {
            editorView.scrollDOM
              .closest('[data-attendable-id]')
              ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'start' });
          }
          return undefined;
        }
        break;
      }
    }
  });

  const handleToolbarAction = useActionHandler(editorView);
  const handleAction = (action: Action) => {
    if (action.type === 'view-mode') {
      onViewModeChange?.(action.data);
    }

    handleToolbarAction?.(action);
  };

  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const file = files[0];
    const info = file && onFileUpload ? await onFileUpload(file) : undefined;

    if (info) {
      processAction(view, { type: 'image', data: info.url });
    }
  };

  return (
    <div role='none' className='contents group/editor' {...(isDirectlyAttended && { 'aria-current': 'location' })}>
      {toolbar && (
        <Toolbar.Root
          classNames='max-is-[60rem] justify-self-center border-be border-transparent group-focus-within/editor:separator-separator group-[[aria-current]]/editor:separator-separator'
          state={formattingState && { ...formattingState, ...commentsState }}
          onAction={handleAction}
        >
          <Toolbar.View mode={viewMode} />
          <Toolbar.Markdown />
          {onFileUpload && <Toolbar.Custom onUpload={onFileUpload} />}
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
      )}
      <div
        role='none'
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className='is-full bs-full overflow-hidden data-[toolbar=disabled]:pbs-2 data-[toolbar=disabled]:row-span-2'
      >
        <div
          role='none'
          ref={parentRef}
          className={mx(
            focusRing,
            textBlockWidth,
            editorFillLayoutRoot,
            'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface md:border-is md:border-ie border-transparent group-focus-within/editor:separator-separator group-[[aria-current]]/editor:separator-separator focus-visible:ring-inset',
            !toolbar && 'border-bs separator-separator',
          )}
          data-testid='composer.markdownRoot'
          {...focusAttributes}
        />
      </div>
    </div>
  );
};

export default EditorMain;
