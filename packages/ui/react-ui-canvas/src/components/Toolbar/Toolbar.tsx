//
// Copyright 2026 DXOS.org
//

//
// The optional editor toolbars (decision 5): every button is an action the view exposes, so a host may
// render these bars, its own, or none; the palette stays a separate component. They are separate bars so
// where a control sits says what it does: `NavigationToolbar` says where the view is in the scene tree,
// `ActionToolbar` changes the scene, and `DebugToolbar` reports the camera's own numbers.
//

import React from 'react';

import { Menu, Toolbar as NaturalToolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { shortcutFor } from '../../model/keys.ts';
import { type NodeRegistry } from '../../model/registry.ts';
import { type Capabilities, type NodeType, type SceneId } from '../../model/types.ts';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs.tsx';

/** What the toolbars can ask of the view; a missing action hides or disables its control. */
export type ToolbarActions = {
  /** Navigation: the scene path, a name per scene, and drill-out by path index. */
  path: SceneId[];
  nameOf: (id: SceneId) => string;
  onPath: (index: number) => void;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  snap: boolean;
  toggleSnap: () => void;
  debug: boolean;
  toggleDebug: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  cut: () => void;
  copy: () => void;
  paste: () => void;
  delete: () => void;
  /** A new node of `type` at the centre of the view. */
  create: (type: NodeType) => void;
  /** Auto layout; absent when the projection does not offer it (`Capabilities.layout`). */
  layout?: () => void;
};

// A bar floats over the canvas, so it takes half the view at most and scrolls what does not fit; the
// toolbar's own layout supplies `overflow-x-auto scrollbar-none`, leaving no bar over the diagram.
const barClasses = 'w-fit max-w-[50%] gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

const readoutClasses = 'text-description font-mono text-sm whitespace-nowrap';

export type NavigationToolbarProps = ThemedClassName<{
  actions: ToolbarActions;
  /** Trailing status, e.g. the depth readout. */
  children?: React.ReactNode;
}>;

/** Where the view is: the drilled path and the readout that follows it. */
export const NavigationToolbar = ({ classNames, actions, children }: NavigationToolbarProps) => {
  const { path } = actions;
  return (
    <NaturalToolbar.Root density='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-toolbar'>
      <NaturalToolbar.Button
        variant='ghost'
        disabled={path.length < 2}
        data-testid='toolbar-up'
        onClick={() => actions.onPath(path.length - 2)}
      >
        Up
      </NaturalToolbar.Button>
      <Breadcrumbs path={path} nameOf={actions.nameOf} onSelect={actions.onPath} />
      {children && (
        <>
          <NaturalToolbar.Separator variant='line' />
          <NaturalToolbar.Text classNames={readoutClasses}>{children}</NaturalToolbar.Text>
        </>
      )}
    </NaturalToolbar.Root>
  );
};

export type DebugToolbarProps = ThemedClassName<{ children?: React.ReactNode }>;

/** The camera's own numbers, away from the controls: nothing here acts on the scene. */
export const DebugToolbar = ({ classNames, children }: DebugToolbarProps) => {
  return (
    <NaturalToolbar.Root density='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-debug'>
      <NaturalToolbar.Text classNames={readoutClasses}>{children}</NaturalToolbar.Text>
    </NaturalToolbar.Root>
  );
};

export type ActionToolbarProps = ThemedClassName<{
  actions: ToolbarActions;
  nodes: NodeRegistry;
  capabilities: Capabilities;
}>;

/** Everything that changes the view or the scene: camera, history, clipboard, creation and debug. */
export const ActionToolbar = ({ classNames, actions, nodes, capabilities }: ActionToolbarProps) => {
  return (
    <NaturalToolbar.Root density='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-actions'>
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--arrows-out--regular'
        label={`Fit (${shortcutFor('fit')})`}
        data-testid='toolbar-fit'
        onClick={actions.fit}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-plus--regular'
        label='Zoom in'
        data-testid='toolbar-zoom-in'
        onClick={actions.zoomIn}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-minus--regular'
        label='Zoom out'
        data-testid='toolbar-zoom-out'
        onClick={actions.zoomOut}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--grid-four--regular'
        label={`Snap (${shortcutFor('snap')}): snap moves, resizes and new nodes to the major grid`}
        classNames={mx(actions.snap && 'bg-primary-500/20')}
        data-testid='toolbar-snap'
        onClick={actions.toggleSnap}
      />
      <NaturalToolbar.Separator variant='line' />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--arrow-u-up-left--regular'
        label={`Undo (${shortcutFor('undo')})`}
        disabled={!actions.canUndo}
        data-testid='undo'
        onClick={actions.undo}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--arrow-u-up-right--regular'
        label={`Redo (${shortcutFor('redo')})`}
        disabled={!actions.canRedo}
        data-testid='redo'
        onClick={actions.redo}
      />
      <NaturalToolbar.Separator variant='line' />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--scissors--regular'
        label={`Cut (${shortcutFor('cut')})`}
        disabled={!actions.hasSelection || !capabilities.delete}
        data-testid='cut'
        onClick={actions.cut}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--copy--regular'
        label={`Copy (${shortcutFor('copy')})`}
        disabled={!actions.hasSelection}
        data-testid='copy'
        onClick={actions.copy}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--clipboard-text--regular'
        label={`Paste (${shortcutFor('paste')})`}
        disabled={!actions.hasClipboard || !capabilities.create}
        data-testid='paste'
        onClick={actions.paste}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--trash--regular'
        label={`Delete (${shortcutFor('delete')})`}
        disabled={!actions.hasSelection || !capabilities.delete}
        data-testid='toolbar-delete'
        onClick={actions.delete}
      />
      <NaturalToolbar.Separator variant='line' />
      <Menu.Root>
        <Menu.Trigger asChild>
          <NaturalToolbar.IconButton
            variant='ghost'
            iconOnly
            icon='ph--plus--regular'
            label='Create a node at the centre of the view'
            disabled={!capabilities.create}
            data-testid='toolbar-create'
          />
        </Menu.Trigger>
        {/* Portalled: inside the bar's flex flow the items would sit under the readout and the canvas. */}
        <Menu.Portal>
          <Menu.Content side='bottom' align='end' sideOffset={4}>
            <Menu.Viewport>
              {Object.values(nodes).map((def) => (
                <Menu.Item key={def.type} data-testid={`create-${def.type}`} onSelect={() => actions.create(def.type)}>
                  {def.name}
                </Menu.Item>
              ))}
            </Menu.Viewport>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--tree-structure--regular'
        label={actions.layout ? 'Auto layout' : 'Auto layout (not offered by this projection)'}
        disabled={!actions.layout}
        data-testid='toolbar-layout'
        onClick={actions.layout}
      />
      <NaturalToolbar.IconButton
        variant='ghost'
        iconOnly
        icon='ph--bug--regular'
        label={`Debug (${shortcutFor('debug')}): label every frame with its id, type and geometry`}
        classNames={mx(actions.debug && 'bg-primary-500/20')}
        data-testid='toolbar-debug'
        onClick={actions.toggleDebug}
      />
    </NaturalToolbar.Root>
  );
};
