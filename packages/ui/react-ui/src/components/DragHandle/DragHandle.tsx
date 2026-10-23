//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type KeyboardEvent, forwardRef, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/Button.tsx';
import { ToolbarContext } from '../Toolbar/toolbar-context.ts';
import { announce, dragScope } from './drag.ts';

export type DragMoveDirection = 'up' | 'down';

//
// DragHandle
//

type DragHandleProps = {
  /** Names the handle for assistive tech; the translated "Drag to rearrange" by default. */
  'label'?: string;
  /**
   * Moves the item one place; makes the handle a tab stop with a keyboard contract: Alt+ArrowUp/Down move at once,
   * Space or Enter grabs so ArrowUp/Down move, and Space, Enter, Escape or leaving the handle drops. Without it the
   * handle is a pointer-only grip, outside the tab order.
   */
  'onMove'?: (direction: DragMoveDirection) => void;
  'disabled'?: boolean;
  'data-testid'?: string;
};

/**
 * A ghost icon-only Button with the six-dot grip for a drag-and-drop source to bind (in a toolbar, a card or a list
 * row). It never joins a toolbar's roving focus and shows no Tooltip; pointer dragging belongs
 * to the caller's drag-and-drop binding (pragmatic-drag-and-drop in react-ui-list), keyboard moves to `onMove`. Moves
 * and grabs are announced through one shared live region.
 */
export const DragHandle = forwardRef<HTMLButtonElement, DragHandleProps>(
  ({ label, onMove, disabled, 'data-testid': testId }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [grabbed, setGrabbed] = useState(false);
    const localRef = useRef<HTMLButtonElement>(null);
    const ref = useComposedRefs(forwardedRef, localRef);
    // Reordering moves the handle's element, which blurs it; the move must not count as leaving the handle.
    const moving = useRef(false);

    const move = (direction: DragMoveDirection, element: HTMLButtonElement) => {
      moving.current = true;
      onMove?.(direction);
      announce(element.ownerDocument, t(`drag-handle.moved-${direction}.message`));
      requestAnimationFrame(() => {
        moving.current = false;
        if (localRef.current?.isConnected && localRef.current !== localRef.current.ownerDocument.activeElement) {
          localRef.current.focus();
        }
      });
    };

    const drop = (element: HTMLButtonElement) => {
      setGrabbed(false);
      announce(element.ownerDocument, t('drag-handle.dropped.message'));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!onMove || disabled) {
        return;
      }
      const direction = event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : undefined;
      if (direction && (event.altKey || grabbed)) {
        event.preventDefault();
        move(direction, event.currentTarget);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (grabbed) {
          drop(event.currentTarget);
        } else {
          setGrabbed(true);
          announce(event.currentTarget.ownerDocument, t('drag-handle.grabbed.message'));
        }
      } else if (event.key === 'Escape' && grabbed) {
        event.preventDefault();
        drop(event.currentTarget);
      }
    };

    return (
      <ToolbarContext.Provider value={undefined}>
        <Button
          icon='ph--dots-six-vertical--regular'
          label={label ?? t('drag-handle.label')}
          iconOnly
          showTooltip={false}
          variant='ghost'
          disabled={disabled}
          tabIndex={onMove ? 0 : -1}
          aria-roledescription={onMove ? t('drag-handle.role.label') : undefined}
          aria-pressed={onMove ? grabbed : undefined}
          data-drag-handle=''
          data-grabbed={grabbed ? '' : undefined}
          data-testid={testId}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            if (grabbed && !moving.current) {
              drop(event.currentTarget);
            }
          }}
          ref={ref}
        />
      </ToolbarContext.Provider>
    );
  },
);

DragHandle.displayName = 'DragHandle';

//
// DropIndicator
//

type DropIndicatorProps = ThemedClassName<{
  /** The side of the target row the dragged item will land on. */
  edge: 'top' | 'bottom';
}>;

/**
 * A line on one edge of a drop target, drawn in the focus-ring colour (`--dx-drop-indicator-color`), absolutely placed
 * so it takes no grid track in a row Container; the row must be positioned (Listbox rows are).
 */
export const DropIndicator = ({ classNames, edge }: DropIndicatorProps) => (
  // A span, so it may sit inside a row's text as well as beside it.
  <span
    aria-hidden='true'
    data-scope='drop-indicator'
    data-part='root'
    data-edge={edge}
    className={mx(recipes.dropIndicator(), classNames)}
  />
);

DropIndicator.displayName = 'DropIndicator';

//
// DragPreview
//

type DragPreviewProps = ThemedClassName<{
  /** The dragged row, whose scope sets the preview's size and level (`dragScope`). */
  source?: HTMLElement | null;
  /** Overrides the size read from the source. */
  size?: Size;
  children?: React.ReactNode;
}>;

/**
 * A block-tall chip for pragmatic-drag-and-drop's custom native preview, which is portalled out of the row's sized
 * scope: it copies the source's `data-size` and level so it reads at the row's size on the row's surface.
 */
export const DragPreview = forwardRef<HTMLDivElement, DragPreviewProps>(
  ({ classNames, source, size, children }, forwardedRef) => {
    const scope = dragScope(source);
    return (
      <div
        data-scope='drag-preview'
        data-part='root'
        data-size={size ?? scope.size}
        data-surface={scope.surface ?? 'raised'}
        className={mx(recipes.dragPreview(), classNames)}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

DragPreview.displayName = 'DragPreview';

export type { DragHandleProps, DragPreviewProps, DropIndicatorProps };

export { dragScope } from './drag.ts';
