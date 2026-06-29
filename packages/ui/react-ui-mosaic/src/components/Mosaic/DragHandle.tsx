//
// Copyright 2026 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React, { type ReactNode, forwardRef } from 'react';

import { Button, IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { useMosaicTileContext } from './Tile';

const MOSAIC_DRAG_HANDLE_NAME = 'Mosaic.DragHandle';

const REACT_UI_TRANSLATION_KEY = '@dxos/react-ui';

export type MosaicDragHandleProps = ThemedClassName<
  Partial<Pick<IconButtonProps, 'icon' | 'label' | 'variant'>> & {
    testId?: string;
    /**
     * Inline glyph rendered in place of the sprite icon. The browser does not rasterize external SVG
     * sprite `<use>` icons into a native drag image, so a tile that appears in its own drag preview
     * (the clone follows the cursor) must use an inline-SVG handle here to stay visible while dragging.
     */
    children?: ReactNode;
  }
>;

/**
 * Affordance that initiates dragging the enclosing {@link MosaicTile}. Renders a button and
 * registers itself with the tile (via context), so consumers only need to drop it inside a
 * `Mosaic.Tile` — no `dragHandle` ref plumbing required.
 */
export const MosaicDragHandle = forwardRef<HTMLButtonElement, MosaicDragHandleProps>(
  (
    { icon = 'ph--dots-six-vertical--regular', label, variant = 'ghost', classNames, testId, children },
    forwardedRef,
  ) => {
    const { t } = useTranslation(REACT_UI_TRANSLATION_KEY);
    const { setDragHandle } = useMosaicTileContext(MOSAIC_DRAG_HANDLE_NAME);
    const ref = composeRefs(forwardedRef, setDragHandle);
    const testIdProps = testId ? { 'data-testid': testId } : {};

    // Inline-glyph variant: stays visible in the tile's own native drag image (sprite icons do not).
    if (children) {
      return (
        <Button
          ref={ref}
          variant={variant}
          tabIndex={-1}
          classNames={['grid place-items-center cursor-grab', classNames]}
          {...testIdProps}
        >
          {children}
          <span className='sr-only'>{label ?? t('toolbar-drag-handle.label')}</span>
        </Button>
      );
    }

    return (
      <IconButton
        ref={ref}
        iconOnly
        noTooltip
        tabIndex={-1}
        variant={variant}
        icon={icon}
        label={label ?? t('toolbar-drag-handle.label')}
        classNames={['cursor-grab', classNames]}
        {...testIdProps}
      />
    );
  },
);

MosaicDragHandle.displayName = MOSAIC_DRAG_HANDLE_NAME;
