//
// Copyright 2026 DXOS.org
//

//
// The canvas's own scene shape: the engine's portal plus an optional `drawing`, a reference to another one. Unset,
// the shape opens its child scene in this drawing; set, it shows the referenced drawing's root scene, which
// the store binds alongside this one (`store.ts`).
//

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type NodeBase, PortalNode, type SceneId } from '@dxos/react-ui-canvas/scene';

export const CanvasSceneNode = Schema.Struct({
  ...PortalNode.fields,
  /** Another drawing whose root scene the shape shows instead of its own child scene. */
  drawing: Schema.optional(Ref.Ref(Drawing.Drawing).annotate({ title: 'Drawing' })),
});
export type CanvasSceneNode = Schema.Schema.Type<typeof CanvasSceneNode>;

/** What an unnamed drawing is called where its id would otherwise show (a linked scene's title, the picker). */
export const UNTITLED_DRAWING = 'Untitled drawing';

/** Separates a linked drawing's URI from its scene id; neither a URI nor a scene id contains it. */
const LINK_SEPARATOR = '|';

/** The id a linked drawing's scene takes in this drawing's store, so it never collides with a local one. */
export const linkedSceneId = (uri: string, scene: SceneId): SceneId => `${uri}${LINK_SEPARATOR}${scene}`;

/** The drawing and scene a linked scene id names, or none for a local scene. */
export const parseLinkedSceneId = (id: SceneId): { uri: string; scene: SceneId } | undefined => {
  const index = id.lastIndexOf(LINK_SEPARATOR);
  return index < 0 ? undefined : { uri: id.slice(0, index), scene: id.slice(index + 1) };
};

/** The URI a scene shape's `drawing` names, whether it is a live `Ref` or its stored (encoded) form. */
export const drawingUri = (node: NodeBase): URI.URI | undefined => {
  const drawing: unknown = Reflect.get(node, 'drawing');
  if (Ref.isRef(drawing)) {
    return drawing.uri;
  }
  if (typeof drawing === 'object' && drawing !== null) {
    const encoded: unknown = Reflect.get(drawing, '/');
    return URI.isURI(encoded) ? encoded : undefined;
  }
  return undefined;
};
