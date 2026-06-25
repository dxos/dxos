//
// Copyright 2026 DXOS.org
//

import { composeRefs } from '@radix-ui/react-compose-refs';
import React, { forwardRef } from 'react';

import { IconButton, type IconButtonProps, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { useMosaicTileContext } from './Tile';

const MOSAIC_DRAG_HANDLE_NAME = 'Mosaic.DragHandle';

const REACT_UI_TRANSLATION_KEY = '@dxos/react-ui';

export type MosaicDragHandleProps = ThemedClassName<
  Partial<Pick<IconButtonProps, 'icon' | 'label' | 'variant'>> & {
    testId?: string;
  }
>;

/**
 * Affordance that initiates dragging the enclosing {@link MosaicTile}. Renders a button and
 * registers itself with the tile (via context), so consumers only need to drop it inside a
 * `Mosaic.Tile` — no `dragHandle` ref plumbing required.
 */
export const MosaicDragHandle = forwardRef<HTMLButtonElement, MosaicDragHandleProps>(
  ({ icon = 'ph--dots-six-vertical--regular', label, variant = 'ghost', classNames, testId }, forwardedRef) => {
    const { t } = useTranslation(REACT_UI_TRANSLATION_KEY);
    const { setDragHandle } = useMosaicTileContext(MOSAIC_DRAG_HANDLE_NAME);
    return (
      <IconButton
        ref={composeRefs(forwardedRef, setDragHandle)}
        iconOnly
        noTooltip
        tabIndex={-1}
        variant={variant}
        icon={icon}
        label={label ?? t('toolbar-drag-handle.label')}
        classNames={['cursor-grab', classNames]}
        {...(testId && { 'data-testid': testId })}
      />
    );
  },
);

MosaicDragHandle.displayName = MOSAIC_DRAG_HANDLE_NAME;
