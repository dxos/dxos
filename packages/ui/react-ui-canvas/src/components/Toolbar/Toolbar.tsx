//
// Copyright 2026 DXOS.org
//

//
// The optional editor toolbar (decision 5): every button is an action the view exposes, so a host may
// render this bar, its own, or none; the palette stays a separate component.
//

import React from 'react';

import { Menu, Toolbar as NaturalToolbar, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { shortcutFor } from '../../model/keys.ts';
import { type NodeRegistry } from '../../model/registry.ts';
import { type Capabilities, type NodeType, type SceneId } from '../../model/types.ts';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs.tsx';

/** What the toolbar can ask of the view; a missing action hides or disables its control. */
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

export type ToolbarProps = ThemedClassName<{
  actions: ToolbarActions;
  nodes: NodeRegistry;
  capabilities: Capabilities;
  /** Trailing status, e.g. zoom and pointer readout. */
  children?: React.ReactNode;
}>;

/** The editor toolbar over the view's actions; `children` is the trailing status readout. */
export const Toolbar = ({ classNames, actions, nodes, capabilities, children }: ToolbarProps) => {
  const { path } = actions;
  return (
    <NaturalToolbar.Root
      density='sm'
      classNames={mx('w-fit gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator', classNames)}
      data-testid='canvas-toolbar'
    >
      <NaturalToolbar.Button
        variant='ghost'
        disabled={path.length < 2}
        data-testid='toolbar-up'
        onClick={() => actions.onPath(path.length - 2)}
      >
        Up
      </NaturalToolbar.Button>
      <Breadcrumbs path={path} nameOf={actions.nameOf} onSelect={actions.onPath} />
      <NaturalToolbar.Separator variant='line' />
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
          <Menu.Content side='bottom' align='start' sideOffset={4}>
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
      {children && (
        <>
          <NaturalToolbar.Separator variant='line' />
          <NaturalToolbar.Text classNames='text-description font-mono text-sm whitespace-nowrap'>
            {children}
          </NaturalToolbar.Text>
        </>
      )}
    </NaturalToolbar.Root>
  );
};
