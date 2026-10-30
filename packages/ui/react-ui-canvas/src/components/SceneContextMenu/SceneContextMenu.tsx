//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useRef } from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';
import { type Point } from '@dxos/scene';

import { type SceneMenuCommand, type SceneMenuItem } from '../../utils/index.ts';

export type SceneContextMenuProps = {
  /** Where it opened, relative to the view; closed when undefined. */
  at?: Point;
  /** The shared commands (`sceneMenuItems`), the same in both dimensions. */
  items: readonly SceneMenuItem[];
  /** Items only one view offers (a control point's, an instance's), after the shared ones. */
  extra?: ReactNode;
  onCommand: (command: SceneMenuCommand) => void;
  onClose: () => void;
};

/**
 * A scene's right-click menu, for 2D and 3D alike: it opens at the pointer, anchored to an empty element parked under
 * it (a menu positions itself at a real element), and lists the shared commands with their shortcuts.
 */
export const SceneContextMenu = ({ at, items, extra, onCommand, onClose }: SceneContextMenuProps) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  return (
    <>
      <span
        ref={anchorRef}
        className='absolute size-0 pointer-events-none'
        style={{ left: at?.x ?? 0, top: at?.y ?? 0 }}
      />
      <Menu.Root
        open={at !== undefined}
        onOpenChange={({ open }) => !open && onClose()}
        positioning={{ ...VirtualAnchor.virtualAnchor(anchorRef), placement: 'right', gutter: 4, overflowPadding: 8 }}
      >
        <Menu.Content>
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separated && <Menu.Separator />}
              <Menu.Item
                data-testid={`menu-${item.id}`}
                disabled={item.disabled}
                onSelect={() => onCommand(item.id)}
                item={{ value: item.label, label: item.label, ...(item.shortcut ? { shortcut: item.shortcut } : {}) }}
              />
            </React.Fragment>
          ))}
          {extra}
        </Menu.Content>
      </Menu.Root>
    </>
  );
};
