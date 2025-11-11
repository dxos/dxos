//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useCallback, useImperativeHandle, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { PopoverMenuProvider } from '../extensions';

import {
  type EditorController,
  Editor as NaturalEditor,
  type EditorProps as NaturalEditorProps,
} from './EditorContent';
import {
  type EditorToolbarState,
  EditorToolbar as NaturalEditorToolbar,
  type EditorToolbarProps as NaturalEditorToolbarProps,
  useEditorToolbarState,
} from './EditorToolbar';

//
// Context
//

type EditorContextValue = {
  controller?: EditorController;
  setController: (controller: EditorController) => void;
} & Pick<NaturalEditorToolbarProps, 'state'>;

const [EditorContextProvider, useEditorContext] = createContext<EditorContextValue>('Editor');

//
// Root
//

type EditorRootProps = PropsWithChildren<Pick<EditorToolbarState, 'viewMode'>>;

const EditorRoot = forwardRef<EditorController, EditorRootProps>(({ children, viewMode }, forwardedRef) => {
  const [controller, setController] = useState<EditorController>();

  const toolbarState = useEditorToolbarState({ viewMode });

  // TODO(burdon): Remove controller from NaturalEditor.
  useImperativeHandle(
    forwardedRef,
    () => ({
      view: controller?.view ?? null,
      focus: () => controller?.view?.focus(),
    }),
    [controller],
  );

  return (
    <EditorContextProvider controller={controller} setController={setController} state={toolbarState}>
      {children}
    </EditorContextProvider>
  );
});

EditorRoot.displayName = 'Editor.Root';

//
// Viewport
//

type EditorViewportProps = PropsWithChildren<{}>;

const EditorViewport = ({ children }: EditorViewportProps) => {
  const _context = useEditorContext(EditorViewport.displayName);

  // TODO(burdon): Move into root.
  return <PopoverMenuProvider>{children}</PopoverMenuProvider>;
};

EditorViewport.displayName = 'Editor.Viewport';

//
// Content
//

type EditorContentProps = NaturalEditorProps;

const EditorContent = (props: EditorContentProps) => {
  const { setController } = useEditorContext(EditorContent.displayName);

  return <NaturalEditor {...props} ref={setController} />;
};

EditorContent.displayName = 'Editor.Content';

//
// Toolbar
//

type EditorToolbarProps = Omit<NaturalEditorToolbarProps, 'getView' | 'state'>;

const EditorToolbar = (props: EditorToolbarProps) => {
  const { controller, state } = useEditorContext(EditorToolbar.displayName);

  const getView = useCallback(() => {
    invariant(controller?.view);
    return controller?.view;
  }, [controller]);

  return <NaturalEditorToolbar {...props} getView={getView} state={state} />;
};

EditorToolbar.displayName = 'Editor.Toolbar';

//
// Editor
//

export const Editor = {
  Root: EditorRoot,
  Viewport: EditorViewport,
  Content: EditorContent,
  Toolbar: EditorToolbar,
};

export type { EditorController, EditorRootProps, EditorViewportProps, EditorContentProps, EditorToolbarProps };
