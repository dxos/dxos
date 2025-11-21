//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import {
  type EditorController,
  EditorContent as NaturalEditorContent,
  type EditorContentProps as NaturalEditorContentProps,
  noopController,
} from '../EditorContent';
import { EditorMenuProvider, type UseEditorMenuProps, useEditorMenu } from '../EditorMenuProvider';
import {
  type EditorToolbarState,
  EditorToolbar as NaturalEditorToolbar,
  type EditorToolbarProps as NaturalEditorToolbarProps,
  useEditorToolbar,
} from '../EditorToolbar';

//
// Context
//

type EditorContextValue = {
  controller?: EditorController;
  setController: (controller: EditorController) => void;
  extensions?: Extension[];
} & Pick<NaturalEditorToolbarProps, 'state'>;

const [EditorContextProvider, useEditorContext] = createContext<EditorContextValue>('Editor');

//
// Root
//

type EditorRootProps = PropsWithChildren<Omit<UseEditorMenuProps, 'viewRef'> & Pick<EditorToolbarState, 'viewMode'>>;

/**
 * Root component for the Editor compound component.
 * Provides context for all child components and manages the editor controller state.
 */
const EditorRoot = forwardRef<EditorController | null, EditorRootProps>(
  ({ children, viewMode, ...props }, forwardedRef) => {
    const state = useEditorToolbar({ viewMode });

    const [controller, setController] = useState<EditorController>();
    useImperativeHandle(forwardedRef, () => controller ?? noopController, [controller]);

    // TODO(burdon): Consider lighter-weight approach if EditorMenuProvider is not needed.
    const { groupsRef, extension, ...menuProps } = useEditorMenu(props);
    const extensions = useMemo(() => [extension], [extension]);

    return (
      <EditorContextProvider
        controller={controller}
        setController={setController}
        extensions={extensions}
        state={state}
      >
        <EditorMenuProvider view={controller?.view} groups={groupsRef.current} {...menuProps}>
          {children}
        </EditorMenuProvider>
      </EditorContextProvider>
    );
  },
);

EditorRoot.displayName = 'Editor.Root';

//
// Viewport
//

type EditorViewportProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Viewport component that wraps the toolbar and editor content area.
 */
const EditorViewport = ({ classNames, children }: EditorViewportProps) => {
  return (
    <div role='none' className={mx('grid grid-rows-[min-content_1fr] bs-full overflow-hidden', classNames)}>
      {children}
    </div>
  );
};

EditorViewport.displayName = 'Editor.Viewport';

//
// Content
//

type EditorContentProps = Omit<NaturalEditorContentProps, 'ref'>;

/**
 * Content component that renders the actual CodeMirror editor.
 * Automatically registers the editor controller with the context.
 */
const EditorContent = ({ extensions: providedExtensions, ...props }: EditorContentProps) => {
  const { extensions: additionalExtensions = [], setController } = useEditorContext(EditorContent.displayName);

  const extensions = useMemo(
    () => [additionalExtensions, providedExtensions].filter(isNonNullable).flat(),
    [providedExtensions, additionalExtensions],
  );

  return <NaturalEditorContent {...props} extensions={extensions} ref={setController} />;
};

EditorContent.displayName = 'Editor.Content';

//
// Toolbar
//

type EditorToolbarProps = Omit<NaturalEditorToolbarProps, 'getView' | 'state'>;

/**
 * Toolbar component that provides editor formatting and control actions.
 * Automatically connects to the editor view through context.
 */
const EditorToolbar = (props: EditorToolbarProps) => {
  const { controller, state } = useEditorContext(EditorToolbar.displayName);

  // TODO(burdon): Fix invariant.
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

/**
 * Compound editor component following the Radix UI pattern.
 *
 * @example
 * ```tsx
 * EditorMenuGroup.Root>
 *   EditorMenuGroup.Toolbar />
 *   EditorMenuGroup.Viewport>
 *     EditorMenuGroup.Content extensions={[...]} />
 *   </Editor.Viewport>
 * </Editor.Root>
 * ```
 */
export const Editor = {
  Root: EditorRoot,
  Viewport: EditorViewport,
  Content: EditorContent,
  Toolbar: EditorToolbar,
};

export type {
  EditorContentProps,
  EditorController,
  EditorRootProps,
  EditorViewportProps,
  // EditorToolbarProps, // TODO(burdon): Restore once removed deprecated props.
};
