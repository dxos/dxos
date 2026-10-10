//
// Copyright 2026 DXOS.org
//

//
// The optional editor toolbars (decision 5): every button is an action the view exposes, so a host may
// render these bars, its own, or none; the palette stays a separate component. They are separate bars so
// where a control sits says what it does: `NavigationToolbar` says where the view is in the scene tree,
// `ActionToolbar` changes the scene, and `CameraToolbar` fits and zooms the view beside its own numbers.
//

import React, { type ReactNode } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
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
  /** Back to true size (100%), about the view's centre. */
  zoomReset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  snap: boolean;
  toggleSnap: () => void;
  guides: boolean;
  toggleGuides: () => void;
  /** On a lattice scene: whether snap lands on the lattice rather than the basic grid; absent elsewhere. */
  lattice?: boolean;
  toggleLattice?: () => void;
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

// A bar fills the frame its host floats it in and scrolls what does not fit; the toolbar's own layout
// supplies `overflow-x-auto scrollbar-none`, leaving no bar over the diagram.
const barClasses = 'w-full gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

const readoutClasses = 'text-fg-muted font-mono text-sm whitespace-nowrap';

export type NavigationToolbarProps = Util.ThemedClassName<{
  actions: ToolbarActions;
  /** Trailing status, e.g. the depth readout. */
  children?: ReactNode;
}>;

/** Where the view is: the drilled path and the readout that follows it. */
export const NavigationToolbar = ({ classNames, actions, children }: NavigationToolbarProps) => {
  const { path } = actions;
  return (
    <Toolbar.Root size='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-toolbar'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrow-up--regular'
        label='Up'
        disabled={path.length < 2}
        data-testid='toolbar-up'
        onClick={() => actions.onPath(path.length - 2)}
      />
      <Breadcrumbs path={path} nameOf={actions.nameOf} onSelect={actions.onPath} />
      {children && (
        <>
          <Toolbar.Separator variant='line' />
          <Toolbar.Text classNames={readoutClasses}>{children}</Toolbar.Text>
        </>
      )}
    </Toolbar.Root>
  );
};

export type CameraToolbarProps = Util.ThemedClassName<{ actions: ToolbarActions; children?: ReactNode }>;

/** The camera: fit and zoom, beside its own numbers; nothing here changes the scene. */
export const CameraToolbar = ({ classNames, actions, children }: CameraToolbarProps) => {
  return (
    <Toolbar.Root size='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-debug'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrows-out--regular'
        label={`Fit (${shortcutFor('fit')})`}
        data-testid='toolbar-fit'
        onClick={actions.fit}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--number-square-one--regular'
        label={`Actual size (${shortcutFor('zoomReset')})`}
        data-testid='toolbar-zoom-reset'
        onClick={actions.zoomReset}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-plus--regular'
        label='Zoom in'
        data-testid='toolbar-zoom-in'
        onClick={actions.zoomIn}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-minus--regular'
        label='Zoom out'
        data-testid='toolbar-zoom-out'
        onClick={actions.zoomOut}
      />
      <Toolbar.Separator variant='line' />
      <Toolbar.Text classNames={readoutClasses}>{children}</Toolbar.Text>
    </Toolbar.Root>
  );
};

export type ActionToolbarProps = Util.ThemedClassName<{
  actions: ToolbarActions;
  nodes: NodeRegistry;
  capabilities: Capabilities;
}>;

/** Everything that changes the scene, plus snap, history, clipboard, creation and debug. */
export const ActionToolbar = ({ classNames, actions, nodes, capabilities }: ActionToolbarProps) => {
  return (
    <Toolbar.Root size='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-actions'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--grid-four--regular'
        label={`Snap (${shortcutFor('snap')}): snap moves, resizes and new nodes to the major grid, or with the lattice on to its cells`}
        classNames={mx(actions.snap && 'bg-primary-500/20')}
        data-testid='toolbar-snap'
        onClick={actions.toggleSnap}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--frame-corners--regular'
        label={`Guides (${shortcutFor('guides')}): show the lattice cells`}
        classNames={mx(actions.guides && 'bg-primary-500/20')}
        data-testid='toolbar-guides'
        onClick={actions.toggleGuides}
      />
      {actions.toggleLattice && (
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--squares-four--regular'
          label={`Lattice (${shortcutFor('lattice')}): snap to the lattice's cells rather than the basic grid`}
          classNames={mx(actions.lattice && 'bg-primary-500/20')}
          data-testid='toolbar-lattice'
          onClick={actions.toggleLattice}
        />
      )}
      <Toolbar.Separator variant='line' />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrow-u-up-left--regular'
        label={`Undo (${shortcutFor('undo')})`}
        disabled={!actions.canUndo}
        data-testid='undo'
        onClick={actions.undo}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrow-u-up-right--regular'
        label={`Redo (${shortcutFor('redo')})`}
        disabled={!actions.canRedo}
        data-testid='redo'
        onClick={actions.redo}
      />
      <Toolbar.Separator variant='line' />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--scissors--regular'
        label={`Cut (${shortcutFor('cut')})`}
        disabled={!actions.hasSelection || !capabilities.delete}
        data-testid='cut'
        onClick={actions.cut}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--copy--regular'
        label={`Copy (${shortcutFor('copy')})`}
        disabled={!actions.hasSelection}
        data-testid='copy'
        onClick={actions.copy}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--clipboard-text--regular'
        label={`Paste (${shortcutFor('paste')})`}
        disabled={!actions.hasClipboard || !capabilities.create}
        data-testid='paste'
        onClick={actions.paste}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--trash--regular'
        label={`Delete (${shortcutFor('delete')})`}
        disabled={!actions.hasSelection || !capabilities.delete}
        data-testid='toolbar-delete'
        onClick={actions.delete}
      />
      <Toolbar.Separator variant='line' />
      <Menu.Root positioning={{ placement: 'bottom-end', gutter: 4 }}>
        <Menu.Trigger asChild>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--plus--regular'
            label='Create a node at the centre of the view'
            disabled={!capabilities.create}
            data-testid='toolbar-create'
          />
        </Menu.Trigger>
        {/* Portalled: inside the bar's flex flow the items would sit under the readout and the canvas. */}
        <Menu.Content>
          {Object.values(nodes).map((def) => (
            <Menu.Item
              key={def.type}
              data-testid={`create-${def.type}`}
              onSelect={() => actions.create(def.type)}
              item={{ value: def.type, label: def.name }}
            />
          ))}
        </Menu.Content>
      </Menu.Root>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--tree-structure--regular'
        label={actions.layout ? 'Auto layout' : 'Auto layout (not offered by this projection)'}
        disabled={!actions.layout}
        data-testid='toolbar-layout'
        onClick={actions.layout}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--bug--regular'
        label={`Debug (${shortcutFor('debug')}): label every frame with its id, type and geometry`}
        classNames={mx(actions.debug && 'bg-primary-500/20')}
        data-testid='toolbar-debug'
        onClick={actions.toggleDebug}
      />
    </Toolbar.Root>
  );
};
