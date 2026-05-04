//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
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
  Pick<EditorContextValue, 'extensions'> &
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
  ({ children, extensions: extensionsProp, viewMode, numItems, ...props }, forwardedRef) => {
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

    return (
      <EditorContextProvider
        controller={controller}
        setController={setController}
        extensions={extensions}
        state={state}
      >
        <EditorMenuProvider view={controller?.view} groups={groupsRef.current} numItems={numItems} {...menuProps}>
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
  return (
    <div role='none' className={mx('grid grid-rows-[min-content_1fr] h-full overflow-hidden', classNames)}>
      {children}
    </div>
  );
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
// Editor
//

export const Editor = {
  Root: EditorRoot,
  Content: EditorContent,
  View: EditorView,
  Toolbar: EditorToolbar,
};

export type {
  EditorController,
  EditorRootProps,
  EditorContentProps,
  EditorViewProps,
  EditorToolbarProps,
  EditorToolbarState,
};

export { createEditorController };
