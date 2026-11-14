//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import { Marker } from '@dxos/scene';

import { type LinkEnd } from '../../engine/index.ts';

/** The choice of no marker, which a link stores as no value. */
export const NO_MARKER = 'none';

/** What a link's end may draw, as a menu and the properties form list it, none first. */
export const MARKER_ITEMS: readonly { value: string; label: string }[] = [
  { value: NO_MARKER, label: 'None' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'circle', label: 'Circle' },
  { value: 'triangle', label: 'Triangle' },
];

const isMarker = Schema.is(Marker);

export type LinkEndMenuItemsProps = {
  /** The end of the link that was pressed. */
  end: LinkEnd;
  /** The marker it draws now. */
  marker?: Marker;
  disabled?: boolean;
  onChange: (marker: Marker | undefined) => void;
};

/**
 * The marker a link's end draws, as the section of a context menu that leads it when the end itself was pressed: the
 * one it has is checked, and picking another sets it.
 */
export const LinkEndMenuItems = ({ end, marker, disabled, onChange }: LinkEndMenuItemsProps) => (
  <>
    <Menu.RadioItemGroup
      value={marker ?? NO_MARKER}
      onValueChange={({ value }) => onChange(isMarker(value) ? value : undefined)}
    >
      <Menu.ItemGroupLabel>{end === 'source' ? 'Start' : 'End'}</Menu.ItemGroupLabel>
      {MARKER_ITEMS.map((item) => (
        <Menu.RadioItem
          key={item.value}
          data-testid={`menu-end-${item.value}`}
          disabled={disabled}
          closeOnSelect
          item={item}
        />
      ))}
    </Menu.RadioItemGroup>
    <Menu.Separator />
  </>
);
