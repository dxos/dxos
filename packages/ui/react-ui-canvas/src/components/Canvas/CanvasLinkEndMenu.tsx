//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { type MenuLinkEnd } from '../../engine/index.ts';
import { endMarker } from '../../utils/index.ts';
import { LinkEndMenuItems } from '../SceneContextMenu/index.ts';
import { useCanvasServices } from './CanvasContext.ts';

/**
 * The context menu's section for a link end of this canvas: the marker the end draws, set through the canvas's own
 * commands, so the view's menu and a host's offer the same thing.
 */
export const CanvasLinkEndMenu = ({ link: id, end }: MenuLinkEnd) => {
  const { draw, controller, capabilities } = useCanvasServices('Canvas.LinkEndMenu');
  const link = useAtomValue(draw.scene).links[id];
  if (!link) {
    return null;
  }
  return (
    <LinkEndMenuItems
      end={end}
      marker={endMarker(link.ends, end)}
      disabled={!capabilities.update || link.locked === true}
      onChange={(marker) => controller.document.setEndMarker(id, end, marker)}
    />
  );
};
