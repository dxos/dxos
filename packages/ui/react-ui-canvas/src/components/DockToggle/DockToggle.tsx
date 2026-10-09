//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export type DockToggleProps = {
  docked: boolean;
  onDockedChange: (docked: boolean) => void;
};

/** A panel toolbar's last item: docks the panels beside the canvas, or floats them back over it. */
export const DockToggle = ({ docked, onDockedChange }: DockToggleProps) => (
  <>
    <Toolbar.Separator variant='gap' />
    <Button.Root
      variant='ghost'
      iconOnly
      icon={docked ? 'ph--arrow-square-out--regular' : 'ph--sidebar-simple--regular'}
      label={docked ? 'Float panels' : 'Dock panels'}
      data-testid='panels-dock'
      onClick={() => onDockedChange(!docked)}
    />
  </>
);
