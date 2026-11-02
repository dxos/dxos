//
// Copyright 2026 DXOS.org
//

import { type EditorView, EditorView as NaturalEditorView, type ViewUpdate } from '@codemirror/view';
import { useAtomSet, useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Editor, type EditorToolbarState, useEditorContext } from '@dxos/react-ui-editor';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import { type Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
  formattingListener,
  scrollbarAutohide,
} from '@dxos/ui-editor';

import { type BackgroundSettings, type SlideInsert, SlideToolbar, useSlideInsertActions } from '#components';
import { type SlideSource, slideSourcesAtom } from '#deck';
import { slideEditorSyncAtom, useObjectOptions } from '#hooks';
import {
  LAYOUTS,
  type SlideEdit,
  SNIPPETS,
  columnSnippet,
  hasSlots,
  insertSnippet,
  nextSlot,
  notesEdit,
  parseSlide,
  setFrontmatter,
  slotBefore,
  surfaceSnippet,
} from '#markdown';
import { Presentation, PresenterOperation, SlideEditorViewState, SlideViewState } from '#types';

import { PresenterNamespace } from '../../namespace.ts';
import { SlidePreview } from '../SlidePreviewArticle/SlidePreview.tsx';
import { slideCompletion } from './slide-completion.ts';
import { slideHighlight } from './slide-highlight.ts';

export type SlideEditorArticleProps = AppSurface.ObjectArticleProps<Text.Text>;

/**
 * Edits one owned slide: formatting and slide tools above the markdown, and the rendered slide below it (or in
 * the plank's companion), kept in step with the cursor.
 */
export const SlideEditorArticle = ({ role, subject, attendableId }: SlideEditorArticleProps) => {
  const { previewMode, splitSize } = useViewState(SlideEditorViewState.aspect, SlideEditorViewState.CONTEXT);
  const { update } = useViewStateActions(SlideEditorViewState.aspect, SlideEditorViewState.CONTEXT);
  const handleSizeChange = useCallback((size: number) => update((state) => ({ ...state, splitSize: size })), [update]);

  return (
    <Editor.Root>
      <Panel.Root role={role}>
        <Panel.Header>
          <SlideEditorToolbars subject={subject} attendableId={attendableId} previewMode={previewMode} />
        </Panel.Header>
        <Panel.Body classNames='flex flex-col'>
          {previewMode === 'split' ? (
            <Splitter.Root
              orientation='vertical'
              anchor='start'
              mode='split'
              resizable
              minSize={6}
              size={splitSize}
              onSizeChange={handleSizeChange}
            >
              <Splitter.Panel position='start'>
                <SlideEditorContent subject={subject} />
              </Splitter.Panel>
              <Splitter.ResizeTrigger />
              <Splitter.Panel position='end'>
                <SlidePreview subject={subject} />
              </Splitter.Panel>
            </Splitter.Root>
          ) : (
            <SlideEditorContent subject={subject} />
          )}
        </Panel.Body>
      </Panel.Root>
    </Editor.Root>
  );
};

SlideEditorArticle.displayName = 'SlideEditorArticle';

type SlideEditorContentProps = Pick<SlideEditorArticleProps, 'subject'>;

/** The markdown editor; publishes its cursor and applies the preview's selection requests. */
const SlideEditorContent = ({ subject }: SlideEditorContentProps) => {
  const { t } = UiHooks.useTranslation(PresenterNamespace.key);
  const themeMode = UiHooks.useThemeMode();
  const registry = useContext(RegistryContext);
  const { controller, state: toolbarState } = useEditorContext('SlideEditorContent');
  const syncAtom = slideEditorSyncAtom(subject.id);
  const setSync = useAtomSet(syncAtom);
  const { select } = useAtomValue(syncAtom);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      // The markdown editor's document slots, so the slide reads at the same measure and margins.
      createThemeExtensions({ themeMode, slots: documentSlots }),
      createMarkdownExtensions(),
      // Fenced code reads as the markdown editor shows it (a shaded block, its fences hidden until the caret enters);
      // the rest stays source, since `decorateMarkdown` would draw a slide's `---` frontmatter fences as rules.
      decorateMarkdown({ nodes: ['FencedCode'] }),
      slideHighlight(),
      slideCompletion({ describeLayout: (layout) => t(`layout.${layout}.label`) }),
      // A slide is too short to fold; the inset the markdown editor's fold gutter gives its text is kept.
      NaturalEditorView.theme({ '.cm-content': { paddingInlineStart: '32px' } }),
      scrollbarAutohide(),
      automerge(Doc.createAccessor(subject, ['content'])),
      formattingListener((formatting: EditorToolbarState) =>
        registry.set(toolbarState, { ...registry.get(toolbarState), ...formatting }),
      ),
      NaturalEditorView.updateListener.of((update: ViewUpdate) => {
        if (update.selectionSet || update.docChanged) {
          const cursor = update.state.selection.main.head;
          setSync((sync) => (sync.cursor === cursor ? sync : { ...sync, cursor }));
        }
      }),
    ],
    [subject, themeMode, registry, toolbarState, setSync, t],
  );

  // Only a new request moves the cursor, so remounting the editor does not replay the last click.
  const handledSeq = useRef(select?.seq);
  useEffect(() => {
    const view = controller?.view;
    if (!view || !select || select.seq === handledSeq.current) {
      return;
    }
    handledSeq.current = select.seq;
    // A caret at the start of the source, not a range, so a click never sets up typing over the element.
    const anchor = Math.min(select.range[0], view.state.doc.length);
    view.dispatch({ selection: { anchor }, scrollIntoView: true });
    view.focus();
  }, [controller, select]);

  return <Editor.View classNames={editorClassNames()} extensions={extensions} />;
};

type SlideEditorToolbarsProps = Pick<SlideEditorArticleProps, 'subject' | 'attendableId'> & {
  previewMode: SlideEditorViewState.PreviewMode;
};

/** The slide toolbar above the markdown formatting toolbar, whose insert group takes the slide's editing actions. */
const SlideEditorToolbars = ({ subject, attendableId, previewMode }: SlideEditorToolbarsProps) => {
  const { controller } = useEditorContext('SlideEditorToolbars');
  const view = controller?.view ?? undefined;
  const [content] = useObject(subject, 'content');
  const parsed = useMemo(() => parseSlide(content ?? ''), [content]);
  const { objects, onObjectsOpenChange, onInsertObject, ...actions } = useSlideActions(subject, attendableId, view);
  const insertActions = useSlideInsertActions({
    onInsert: actions.onInsert,
    columns: hasSlots(parsed.layout),
    objects,
    onObjectsOpenChange,
    onInsertObject,
  });

  return (
    // Each toolbar scrolls on its own row, so neither hides the other in a narrow plank.
    <div className='flex flex-col'>
      <SlideToolbar
        layout={parsed.layout}
        background={{ image: parsed.frontmatter.image, backgroundVideo: parsed.frontmatter.backgroundVideo }}
        classNames='dx-document'
        previewMode={previewMode}
        {...actions}
      />
      {/* The formatting toolbar reads the editor view, which exists only after the editor mounts. */}
      {view && (
        <Editor.Toolbar
          classNames='dx-document'
          attendableId={attendableId}
          showSearch={false}
          customActions={insertActions}
        />
      )}
    </div>
  );
};

/** Stands in for the slides of a slide with no presentation. */
const NO_SLIDES = Atom.make<SlideSource[]>([]);

/** Toolbar callbacks: each edit is one change to the editor (one undo step), the rest are navigation. */
const useSlideActions = (subject: Text.Text, attendableId: string | undefined, view: EditorView | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { update } = useViewStateActions(SlideEditorViewState.aspect, SlideEditorViewState.CONTEXT);
  const presentation = Presentation.getPresentation(subject);
  // The deck's slides: a slide whose content was deleted is no slide to move to.
  const slides = useAtomValue(
    useMemo(() => (presentation ? slideSourcesAtom(presentation) : NO_SLIDES), [presentation]),
  );
  const position = slides.findIndex((slide) => slide.kind === 'text' && slide.text.id === subject.id);
  const { set: setSlideIndex } = useViewStateActions(
    SlideViewState.aspect,
    presentation ? Obj.getURI(presentation) : undefined,
  );

  const [objectsOpen, setObjectsOpen] = useState(false);
  const include = useCallback((object: Obj.Unknown) => object.id !== subject.id, [subject]);
  const objects = useObjectOptions(objectsOpen ? Obj.getDatabase(subject) : undefined, include);

  const apply = useCallback(
    (edit: (content: string, cursor: number) => SlideEdit, moveCursor = true) => {
      if (!view) {
        return;
      }
      const result = edit(view.state.doc.toString(), view.state.selection.main.head);
      view.dispatch({
        changes: { from: result.from, to: result.to, insert: result.insert },
        // Frontmatter edits leave the cursor where it was (mapped through the change).
        ...(moveCursor ? { selection: { anchor: result.cursor } } : {}),
        scrollIntoView: true,
      });
      // A menu or popover returns focus to its trigger as it closes, so the editor takes it back afterwards.
      requestAnimationFrame(() => view.focus());
    },
    [view],
  );

  const open = useCallback(
    (index: number) => {
      const id = slides[index]?.id;
      const db = Obj.getDatabase(subject);
      if (!presentation || !db || !id) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getCollectionObjectPath(GraphPath.getObjectPathFromObject(presentation), id)],
        workspace: GraphPath.getSpacePath(db.spaceId),
      });
    },
    [invokePromise, presentation, slides, subject],
  );

  return {
    onLayoutChange: (layout: (typeof LAYOUTS)[number]) =>
      apply((content) => setFrontmatter(content, { layout: layout === 'default' ? undefined : layout }), false),
    onInsert: (insert: SlideInsert) =>
      apply((content, cursor) => {
        switch (insert) {
          case 'notes':
            return notesEdit(content);
          case 'column': {
            // The next region of the layout after the one holding the caret; the last region has none.
            const parsed = parseSlide(content);
            const slot = nextSlot(parsed.layout, slotBefore(content, cursor));
            return slot
              ? insertSnippet(content, cursor, columnSnippet(slot))
              : { from: cursor, to: cursor, insert: '', cursor };
          }
          default:
            return insertSnippet(content, cursor, SNIPPETS[insert]);
        }
      }),
    onBackgroundChange: (background: BackgroundSettings) =>
      apply((content) => setFrontmatter(content, background), false),
    objects,
    onObjectsOpenChange: setObjectsOpen,
    onInsertObject: (id: string) =>
      apply((content, cursor) => insertSnippet(content, cursor, surfaceSnippet(EID.make({ entityId: id })))),
    onPreviewModeChange: (previewMode: SlideEditorViewState.PreviewMode) => {
      update((state) => ({ ...state, previewMode }));
      void invokePromise(LayoutOperation.UpdateCompanion, {
        subject: previewMode === 'companion' ? `~${SlideEditorViewState.COMPANION_VARIANT}` : null,
        anchor: attendableId,
      });
    },
    onPrevious: position > 0 ? () => open(position - 1) : undefined,
    onNext: position >= 0 && position < slides.length - 1 ? () => open(position + 1) : undefined,
    onPresent:
      presentation && position >= 0
        ? () => {
            setSlideIndex({ index: position });
            void invokePromise(PresenterOperation.SetPresenting, { object: presentation, state: true });
          }
        : undefined,
  };
};
