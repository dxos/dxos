//
// Copyright 2025 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { type EditorView as CodeMirrorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';
import React, {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type PropsWithChildren,
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import type * as Util from '@dxos/react-ui/Util';
import { handleBlockWidgetKey } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import {
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseEditorMenuProps,
  useEditorMenu,
} from '../EditorMenuProvider/index.ts';
import {
  type EditorToolbarState,
  EditorToolbar as NaturalEditorToolbar,
  EditorToolbarMenu as NaturalEditorToolbarMenu,
  type EditorToolbarMenuProps as NaturalEditorToolbarMenuProps,
  type EditorToolbarProps as NaturalEditorToolbarProps,
} from '../EditorToolbar/index.ts';
import { type EditorController, noopController } from './controller.ts';
import { EditorContextProvider, type EditorContextValue, useEditorContext } from './EditorContext.ts';
import {
  EditorView as NaturalEditorContent,
  type EditorViewProps as NaturalEditorContentProps,
} from './EditorView.tsx';

//
// Root
//

type EditorRootProps = PropsWithChildren<
  Pick<EditorContextValue, 'extensions' | 'widgets'> &
    Omit<UseEditorMenuProps, 'viewRef'> &
    Pick<EditorMenuProviderProps, 'numItems' | 'searchPlaceholder'> & {
      viewMode?: EditorToolbarState['viewMode'];
    }
>;

/**
 * Root component for the Editor compound component.
 * Provides context for all child components and manages the editor controller state.
 */
const EditorRoot = forwardRef<EditorController | null, EditorRootProps>(
  (
    { children, extensions: extensionsProp, widgets, viewMode, numItems, searchPlaceholder, ...props },
    forwardedRef,
  ) => {
    // TODO(wittjosiah): Including initialState in the deps causes reactivity issues.
    const state = useMemo(() => Atom.make<EditorToolbarState>({ viewMode }), [viewMode]);

    // TODO(burdon): Consider lighter-weight approach if EditorMenuProvider is not needed.
    const { groupsRef, extension, ...menuProps } = useEditorMenu(props);
    const extensions = useMemo(
      () => [extension, extensionsProp].filter(isNonNullable).flat(),
      [extension, extensionsProp],
    );

    // External controller.
    const [controller, setController] = useState<EditorController>(noopController);
    useImperativeHandle(forwardedRef, () => controller, [controller]);
    const getView = useCallback(() => controller?.view ?? null, [controller]);

    return (
      <EditorContextProvider
        controller={controller}
        setController={setController}
        extensions={extensions}
        widgets={widgets}
        state={state}
      >
        <EditorMenuProvider
          getView={getView}
          groups={groupsRef.current}
          numItems={numItems}
          searchPlaceholder={searchPlaceholder}
          {...menuProps}
        >
          {children}
        </EditorMenuProvider>
      </EditorContextProvider>
    );
  },
);

EditorRoot.displayName = 'Editor.Root';

//
// Content
//

const EDITOR_CONTENT_NAME = 'Editor.Content';

type EditorContentProps = Util.ThemedClassName<PropsWithChildren<{}>>;

/**
 * Content component that wraps the toolbar and editor view area.
 */
const EditorContent = ({ classNames, children }: EditorContentProps) => {
  return <div className={mx('grid grid-rows-[min-content_1fr] h-full overflow-hidden', classNames)}>{children}</div>;
};

EditorContent.displayName = EDITOR_CONTENT_NAME;

//
// View
//

const EDITOR_VIEW_NAME = 'Editor.View';

type EditorViewProps = Omit<NaturalEditorContentProps, 'ref'>;

/**
 * View component that renders the actual CodeMirror editor.
 * Automatically registers the editor controller with the context.
 */
const EditorView = ({ extensions: providedExtensions, ...props }: EditorViewProps) => {
  const { extensions: additionalExtensions = [], setController } = useEditorContext(EDITOR_VIEW_NAME);
  const extensions = useMemo(
    () => [additionalExtensions, providedExtensions].filter(isNonNullable).flat(),
    [providedExtensions, additionalExtensions],
  );

  return <NaturalEditorContent {...props} extensions={extensions} ref={setController} />;
};

EditorView.displayName = EDITOR_VIEW_NAME;

//
// Toolbar
//

const EDITOR_TOOLBAR_NAME = 'Editor.Toolbar';

type EditorToolbarProps = Omit<NaturalEditorToolbarProps, 'getView' | 'state'>;

/**
 * Toolbar component that provides editor formatting and control actions.
 * Automatically connects to the editor view through context.
 */
const EditorToolbar = (props: EditorToolbarProps) => {
  const { controller, state } = useEditorContext(EDITOR_TOOLBAR_NAME);
  const getView = useCallback(() => {
    invariant(controller?.view);
    return controller?.view;
  }, [controller]);

  return <NaturalEditorToolbar {...props} getView={getView} state={state} />;
};

EditorToolbar.displayName = EDITOR_TOOLBAR_NAME;

//
// ToolbarMenu
//

const EDITOR_TOOLBAR_MENU_NAME = 'Editor.ToolbarMenu';

type EditorToolbarMenuProps = Omit<NaturalEditorToolbarMenuProps, 'getView' | 'state'>;

/**
 * The toolbar's actions as a menu opened from its trigger (the child), for where a toolbar does not fit.
 * Connects to the editor view through context, as `Editor.Toolbar` does.
 */
const EditorToolbarMenu = (props: EditorToolbarMenuProps) => {
  const { controller, state } = useEditorContext(EDITOR_TOOLBAR_MENU_NAME);
  const getView = useCallback(() => {
    invariant(controller?.view);
    return controller?.view;
  }, [controller]);

  return <NaturalEditorToolbarMenu {...props} getView={getView} state={state} />;
};

EditorToolbarMenu.displayName = EDITOR_TOOLBAR_MENU_NAME;

//
// Blocks
//

const EDITOR_BLOCKS_NAME = 'Editor.Blocks';

/**
 * Renders the xmlTags widget portals (embedded blocks) contributed via the editor's `setWidgets`
 * callback. Place inside `Editor.Root`; the widgets come from context (pass them to `Editor.Root`).
 */
const EditorBlocks = () => {
  const { widgets = [] } = useEditorContext(EDITOR_BLOCKS_NAME);
  return (
    <>
      {widgets.map(({ id, root, Component, props }) => (
        <div key={id} data-testid='editor.blocks.portal'>
          {/* Per-portal boundary: a block that suspends (capability wait, lazy surface module) must
              not hold the surrounding editor tree un-committed — that made embeds invisible until
              a view-mode toggle rebuilt everything. */}
          {createPortal(
            <Suspense fallback={null}>
              <Component {...props} />
            </Suspense>,
            root,
          )}
        </div>
      ))}
    </>
  );
};

EditorBlocks.displayName = EDITOR_BLOCKS_NAME;

//
// BlockFrame
//

const EDITOR_BLOCK_FRAME_NAME = 'Editor.BlockFrame';

/** What Enter on a selected block focuses when the block names nothing: the first enabled element inside it that takes input. */
const FOCUSABLE =
  ':is(input, textarea, select, button):not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

type EditorBlockFrameProps = Util.ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  view?: CodeMirrorView;
  /** Whether the block has attention; until it does, its keys reach the editor. */
  attended: boolean;
  /** The element Enter on the selected block focuses. */
  enterTarget?: string;
};

/**
 * The frame of an embedded block: it takes focus for the block, which selects it and shows the focus ring, and while
 * selected it answers the editor's block keys (`handleBlockWidgetKey`). Enter goes into the block, Escape inside it
 * selects it again unless the block consumes it (`preventDefault`), and while attended no key leaves it. A click on
 * anything but a button selects it.
 */
const EditorBlockFrame = forwardRef<HTMLDivElement, EditorBlockFrameProps>(
  ({ classNames, children, view, attended, enterTarget = FOCUSABLE, ...props }, forwardedRef) => {
    const handleMouseDown = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        if (!attended && !(event.target instanceof Element && event.target.closest('button'))) {
          event.currentTarget.focus();
        }
      },
      [attended],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (!attended) {
          return;
        }
        event.stopPropagation();
        const frame = event.currentTarget;
        if (event.defaultPrevented || !view) {
          return;
        }
        if (event.target !== frame) {
          if (event.key === 'Escape') {
            event.preventDefault();
            frame.focus();
          }
          return;
        }
        if (event.key === 'Enter') {
          const target = frame.querySelector<HTMLElement>(enterTarget);
          if (target) {
            event.preventDefault();
            target.focus();
            target instanceof HTMLInputElement && target.select();
          }
        } else if (handleBlockWidgetKey(view, frame, event)) {
          event.preventDefault();
        }
      },
      [attended, view, enterTarget],
    );

    const handleKeyUp = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (attended) {
          event.stopPropagation();
        }
      },
      [attended],
    );

    return (
      <div
        {...props}
        ref={forwardedRef}
        tabIndex={0}
        // `white-space` is reset: the editor's `break-spaces` would otherwise lay out the block's template whitespace.
        className={mx('dx-focus-item rounded-md whitespace-normal', classNames)}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        {children}
      </div>
    );
  },
);

EditorBlockFrame.displayName = EDITOR_BLOCK_FRAME_NAME;

//
// Diagnostics
//

const EDITOR_DIAGNOSTICS_NAME = 'Editor.Diagnostics';

/** Rough leaf count of a (recursively nested) CodeMirror extension tree. */
const countExtensions = (extension: Extension | undefined): number =>
  extension == null
    ? 0
    : Array.isArray(extension)
      ? extension.reduce((sum, child) => sum + countExtensions(child), 0)
      : 1;

type EditorDiagnosticsProps = Util.ThemedClassName<{}>;

/**
 * Developer panel showing live editor state read from the CodeMirror `EditorState` (document size,
 * selection, viewport, configured-extension count). A debugging aid — gate it behind a dev/debug
 * setting; unrelated to `@codemirror/lint` diagnostics. Place inside `Editor.Root`, below the content.
 */
const EditorDiagnostics = ({ classNames }: EditorDiagnosticsProps) => {
  const { controller, extensions } = useEditorContext(EDITOR_DIAGNOSTICS_NAME);
  const view = controller?.view ?? null;
  // `EditorState` is immutable (a new object per transaction), so a reference change signals an update.
  // Poll on animation frames while mounted — self-contained (no injected updateListener) and re-renders
  // only when the state actually changes; catches programmatic transactions too.
  const [, setRevision] = useState(0);
  const lastState = useRef<EditorState | null>(null);
  useEffect(() => {
    if (!view) {
      return;
    }
    let frame = 0;
    const tick = () => {
      if (view.state !== lastState.current) {
        lastState.current = view.state;
        setRevision((revision) => revision + 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [view]);

  if (!view) {
    return null;
  }

  const { state } = view;
  const { doc, selection } = state;
  const { main } = selection;
  const head = doc.lineAt(main.head);
  // The context holds the extensions passed to `Root`; count leaves (CodeMirror does not expose the
  // resolved extension set at runtime, so this is the configured, not the active, count).
  const extensionCount = countExtensions(extensions);
  const item = (label: string, value: string | number) => (
    <span>
      <span className='text-fg-subtle'>{label} </span>
      {value}
    </span>
  );

  return (
    <div
      className={mx(
        'flex flex-wrap gap-x-4 gap-y-0.5 border-bs border-separator px-2 py-1 text-xs font-mono text-fg-muted',
        classNames,
      )}
      data-testid='editor.diagnostics'
    >
      {item('chars', doc.length)}
      {item('lines', doc.lines)}
      {item(
        'cursor',
        main.empty ? `${head.number}:${main.head - head.from + 1}` : `${main.from}–${main.to} (${main.to - main.from})`,
      )}
      {selection.ranges.length > 1 && item('ranges', selection.ranges.length)}
      {item('viewport', `${view.viewport.from}–${view.viewport.to}`)}
      {item('mode', state.readOnly ? 'read-only' : 'editable')}
      {item('extensions', extensionCount)}
    </div>
  );
};

EditorDiagnostics.displayName = EDITOR_DIAGNOSTICS_NAME;

//
// Editor
//

export const Editor = {
  Root: EditorRoot,
  Toolbar: EditorToolbar,
  ToolbarMenu: EditorToolbarMenu,
  Content: EditorContent,
  View: EditorView,
  Blocks: EditorBlocks,
  BlockFrame: EditorBlockFrame,
  Diagnostics: EditorDiagnostics,
};

export type {
  EditorBlockFrameProps,
  EditorContentProps,
  EditorController,
  EditorRootProps,
  EditorToolbarMenuProps,
  EditorToolbarProps,
  EditorToolbarState,
  EditorViewProps,
};
