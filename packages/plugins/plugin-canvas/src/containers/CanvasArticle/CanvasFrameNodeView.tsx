//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Entity, Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { FrameNodeView, type NodeViewProps, SCENE_OVERLAY_ATTRIBUTE, isFrameNode } from '@dxos/react-ui-canvas/scene';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type FrameRole, frameRole, isSceneCanvas, objectRef, parseLinkedSceneId } from '#model';

/** The object a frame shows as a surface, or `undefined` when it shows a scene (its own or a canvas drawing's). */
const useSurfaceObject = (node: NodeViewProps['node']): Obj.Unknown | undefined => {
  const object = useResolveRef(objectRef(node));
  const canvas = useResolveRef(Obj.instanceOf(Drawing.Drawing, object) ? object.canvas : undefined);
  // A canvas drawing is a scene, and so is a drawing whose canvas has not loaded yet; the store links it.
  const drawing = Obj.instanceOf(Drawing.Drawing, object) && (canvas === undefined || isSceneCanvas(canvas));
  return !object || drawing || !isFrameNode(node) || parseLinkedSceneId(node.scene) ? undefined : object;
};

/** The canvas's frame: its scene (its own or a linked canvas drawing's), or any other object as a surface. */
export const CanvasFrameNodeView = (props: NodeViewProps) => {
  const { node } = props;
  const object = useSurfaceObject(node);
  if (!object || !isFrameNode(node)) {
    return <FrameNodeView {...props} />;
  }
  return <FrameSurface object={object} role={frameRole(node)} />;
};

/** Above a frame showing an object, the control that opens it in the app; a scene frame keeps its own inside. */
export const CanvasFrameToolbar = ({ node, onOpen }: NodeViewProps) => {
  const object = useSurfaceObject(node);
  if (!object || !onOpen) {
    return null;
  }
  return (
    <Toolbar.Root classNames='rounded-sm bg-modal-surface border border-separator' data-testid='frame-toolbar'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrows-out--regular'
        label='Open object'
        data-testid='frame-open'
        onClick={onOpen}
      />
    </Toolbar.Root>
  );
};

type FrameSurfaceProps = { object: Obj.Unknown; role: FrameRole };

// The object's own scrolling content takes the wheel, rather than the canvas panning under it.
const overlay = { [SCENE_OVERLAY_ATTRIBUTE]: true };

/** An object shown in a frame as its surface of the frame's role. */
const FrameSurface = ({ object, role }: FrameSurfaceProps) => {
  if (role === 'card') {
    return (
      <>
        {/* The frame already frames it, so the card fills the body without a border of its own. */}
        <Card.Root grid border={false} classNames='dx-cover' data-testid='frame-surface' data-role={role} {...overlay}>
          <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
        </Card.Root>
      </>
    );
  }
  // Section and article are sized by the frame rather than their content (`extrinsic`).
  const data = { subject: object, attendableId: Entity.getURI(object), extrinsic: true };
  return (
    <>
      <div
        className='dx-cover grid grid-rows-[minmax(0,1fr)] overflow-hidden'
        data-testid='frame-surface'
        data-role={role}
        {...overlay}
      >
        {role === 'section' ? (
          <Surface.Surface type={AppSurface.Section} data={data} limit={1} />
        ) : (
          <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
        )}
      </div>
    </>
  );
};
