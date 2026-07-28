//
// Copyright 2025 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
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
import { type ThemedClassName } from '@dxos/react-ui';
import { type XmlWidgetState } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import {
  EditorMenuProvider,
  type EditorMenuProviderProps,
  type UseEditorMenuProps,
  useEditorMenu,
} from '../EditorMenuProvider';
import {
  type EditorToolbarState,
  EditorToolbar as NaturalEditorToolbar,
  type EditorToolbarProps as NaturalEditorToolbarProps,
} from '../EditorToolbar';
import {
  type EditorController,
  EditorView as NaturalEditorContent,
  type EditorViewProps as NaturalEditorContentProps,
  createEditorController,
  noopController,
} from './EditorView';

//
// Context
//

type EditorContextValue = {
  controller?: EditorController;
  setController: (controller: EditorController) => void;
  extensions?: Extension[];
  /** xmlTags widget portals (embedded blocks); rendered by `Editor.Blocks`, fed via `setWidgets`. */
  widgets?: XmlWidgetState[];
  state: Atom.Writable<EditorToolbarState>;
};

const [EditorContextProvider, useEditorContext] = createContext<EditorContextValue>('Editor');

/**
 * Access the editor context. Must be used within `Editor.Root`.
 */
export { useEditorContext };

//
// Root
//

type EditorRootProps = PropsWithChildren<
  Pick<EditorContextValue, 'extensions' | 'widgets'> &
    Omit<UseEditorMenuProps, 'viewRef'> &
    Pick<EditorMenuProviderProps, 'numItems'> & {
      viewMode?: EditorToolbarState['viewMode'];
    }
>;

/**
 * Root component for the Editor compound component.
 * Provides context for all child components and manages the editor controller state.
 */
const EditorRoot = forwardRef<EditorController | null, EditorRootProps>(
  ({ children, extensions: extensionsProp, widgets, viewMode, numItems, ...props }, forwardedRef) => {
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
        <EditorMenuProvider getView={getView} groups={groupsRef.current} numItems={numItems} {...menuProps}>
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

type EditorContentProps = ThemedClassName<PropsWithChildren<{}>>;

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
        <div key={id}>{createPortal(<Component {...props} />, root)}</div>
      ))}
    </>
  );
};

EditorBlocks.displayName = EDITOR_BLOCKS_NAME;

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

type EditorDiagnosticsProps = ThemedClassName<{}>;

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
      <span className='text-subdued'>{label} </span>
      {value}
    </span>
  );

  return (
    <div
      className={mx(
        'flex flex-wrap gap-x-4 gap-y-0.5 border-bs border-separator px-2 py-1 text-xs font-mono text-description',
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
  Content: EditorContent,
  View: EditorView,
  Blocks: EditorBlocks,
  Diagnostics: EditorDiagnostics,
};

export type {
  EditorContentProps,
  EditorController,
  EditorRootProps,
  EditorToolbarProps,
  EditorToolbarState,
  EditorViewProps,
};

export { createEditorController };
