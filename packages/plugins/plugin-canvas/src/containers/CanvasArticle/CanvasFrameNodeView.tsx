//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Entity, Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  FrameNodeView,
  type NodeViewProps,
  OpenControl,
  SCENE_OVERLAY_ATTRIBUTE,
  isFrameNode,
} from '@dxos/react-ui-canvas/scene';
import * as Card from '@dxos/react-ui/Card';

import { type FrameRole, frameRole, isSceneCanvas, objectRef, parseLinkedSceneId } from '#model';

/** The canvas's frame: its scene (its own or a linked canvas drawing's), or any other object as a surface. */
export const CanvasFrameNodeView = (props: NodeViewProps) => {
  const { node } = props;
  const object = useResolveRef(objectRef(node));
  const canvas = useResolveRef(Obj.instanceOf(Drawing.Drawing, object) ? object.canvas : undefined);
  // A canvas drawing is a scene, and so is a drawing whose canvas has not loaded yet; the store links it.
  const drawing = Obj.instanceOf(Drawing.Drawing, object) && (canvas === undefined || isSceneCanvas(canvas));
  if (!object || drawing || !isFrameNode(node) || parseLinkedSceneId(node.scene)) {
    return <FrameNodeView {...props} />;
  }
  return <FrameSurface object={object} role={frameRole(node)} onOpen={props.onOpen} />;
};

type FrameSurfaceProps = { object: Obj.Unknown; role: FrameRole; onOpen?: () => void };

/** An object shown in a frame as its surface of the frame's role, with the open control that opens it in the app. */
// The object's own scrolling content takes the wheel, rather than the canvas panning under it.
const overlay = { [SCENE_OVERLAY_ATTRIBUTE]: true };

const FrameSurface = ({ object, role, onOpen }: FrameSurfaceProps) => {
  const control = onOpen && <OpenControl label='Open object' onOpen={onOpen} />;
  if (role === 'card') {
    return (
      <>
        {/* The frame already frames it, so the card fills the body without a border of its own. */}
        <Card.Root grid border={false} classNames='dx-cover' data-testid='frame-surface' data-role={role} {...overlay}>
          <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
        </Card.Root>
        {control}
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
      {control}
    </>
  );
};
