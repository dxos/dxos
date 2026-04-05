//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

import { SpacetimeCanvas, type SpacetimeCanvasProps } from '../SpacetimeCanvas';
import { type SpacetimeTool, SpacetimeToolbar, type SpacetimeToolbarProps } from '../SpacetimeToolbar';

//
// Context
//

const SPACETIME_EDITOR = 'SpacetimeEditor';

type SpacetimeEditorContextValue = {
  tool: SpacetimeTool;
  onToolChange: (tool: SpacetimeTool) => void;
};

const [SpacetimeEditorProvider, useSpacetimeEditorContext] =
  createContext<SpacetimeEditorContextValue>(SPACETIME_EDITOR);

//
// Controller
//

interface SpacetimeController {
  setTool(tool: SpacetimeTool): void;
}

//
// Root
//

const SPACETIME_EDITOR_ROOT = 'SpacetimeEditor:Root';

type SpacetimeEditorRootProps = PropsWithChildren<{}>;

const SpacetimeEditorRoot = forwardRef<SpacetimeController, SpacetimeEditorRootProps>(({ children }, forwardedRef) => {
  const [tool, setTool] = useState<SpacetimeTool>('select');

  const handleToolChange = useCallback((tool: SpacetimeTool) => setTool(tool), []);

  useImperativeHandle(forwardedRef, () => ({
    setTool: handleToolChange,
  }));

  return (
    <SpacetimeEditorProvider tool={tool} onToolChange={handleToolChange}>
      {children}
    </SpacetimeEditorProvider>
  );
});

SpacetimeEditorRoot.displayName = SPACETIME_EDITOR_ROOT;

//
// Toolbar
//

const SPACETIME_EDITOR_TOOLBAR = 'SpacetimeEditor:Toolbar';

type SpacetimeEditorToolbarProps = Pick<SpacetimeToolbarProps, 'alwaysActive'>;

const SpacetimeEditorToolbar = composable<HTMLDivElement, SpacetimeEditorToolbarProps>((props, forwardedRef) => {
  const { tool, onToolChange } = useSpacetimeEditorContext(SPACETIME_EDITOR_TOOLBAR);

  return <SpacetimeToolbar {...composableProps(props)} tool={tool} onToolChange={onToolChange} ref={forwardedRef} />;
});

SpacetimeEditorToolbar.displayName = SPACETIME_EDITOR_TOOLBAR;

//
// Canvas
//

const SPACETIME_EDITOR_CANVAS = 'SpacetimeEditor:Canvas';

type SpacetimeEditorCanvasProsp = Omit<SpacetimeCanvasProps, 'showAxes' | 'showFps'>;

const SpacetimeEditorCanvas = composable<HTMLDivElement, SpacetimeEditorCanvasProsp>((props, forwardedRef) => {
  const _ = useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
  return <SpacetimeCanvas {...composableProps(props)} ref={forwardedRef} />;
});

SpacetimeEditorCanvas.displayName = SPACETIME_EDITOR_CANVAS;

//
// Composite export
//

export const SpacetimeEditor = {
  Root: SpacetimeEditorRoot,
  Toolbar: SpacetimeEditorToolbar,
  Canvas: SpacetimeEditorCanvas,
};

export type { SpacetimeController, SpacetimeEditorRootProps, SpacetimeEditorToolbarProps, SpacetimeEditorCanvasProsp };
