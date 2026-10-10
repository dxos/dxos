//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  type Node,
  type NodeRegistry,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  useRegistry,
} from '@dxos/react-ui-canvas/scene';

import { type BoundCanvasStore, CanvasFrameNode, bindCanvasStore } from '#model';
import { CanvasCapabilities } from '#types';

import { CanvasFrameNodeView, CanvasFrameToolbar } from './CanvasFrameNodeView.tsx';

/** The canvas's scene store, bound for the canvas's lifetime in this view; a new canvas rebinds. */
export const useBoundCanvasStore = (canvas: Drawing.Canvas): BoundCanvasStore | undefined => {
  const registry = useRegistry();
  const [bound, setBound] = useState<BoundCanvasStore>();
  useEffect(() => {
    const next = bindCanvasStore(registry, canvas);
    setBound(next);
    return () => next.dispose();
  }, [registry, canvas]);
  return bound;
};

/**
 * The built-in node types and whatever other plugins contribute (a contribution may replace a built-in).
 * The canvas's frame may show an object (`object`): a canvas drawing the store binds alongside, else a surface.
 */
export const useCanvasNodes = (hostOpen?: (node: Node) => (() => void) | undefined): NodeRegistry => {
  const contributed = Hooks.useCapabilities(CanvasCapabilities.NodeType);
  return useMemo(
    () =>
      createNodeRegistry(
        {
          ...defaultNodeTypes,
          frame: {
            ...defaultNodeTypes.frame,
            schema: CanvasFrameNode,
            component: CanvasFrameNodeView,
            toolbar: CanvasFrameToolbar,
            hostOpen,
          },
          ...Object.fromEntries(contributed.map(({ type, spec }) => [type, spec])),
        },
        defaultNodePrototypes,
      ),
    [contributed, hostOpen],
  );
};
