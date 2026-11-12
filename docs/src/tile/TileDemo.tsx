//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { type ComponentType, useSyncExternalStore } from 'react';

import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';
import { translations } from '@dxos/react-ui/translations';

import {
  Buttons,
  ContactMenu,
  ContactsPanel,
  EditDialog,
  Icons,
  Inputs,
  SavedToast,
  SaveTooltip,
  SharePopover,
  Sizes,
  States,
} from '../echo/snippets/tile-components.tsx';

/** The previews a page can show, by id; each is the snippet the page prints beside it. */
const PREVIEWS: Record<string, ComponentType> = {
  buttons: Buttons,
  dialog: EditDialog,
  icons: Icons,
  inputs: Inputs,
  menu: ContactMenu,
  panel: ContactsPanel,
  popover: SharePopover,
  sizes: Sizes,
  status: States,
  toast: SavedToast,
  tooltip: SaveTooltip,
};

const root = () => document.documentElement;

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(root(), { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

/** Follows the `dark` class that the docs head mirrors from Starlight's theme picker. */
const useThemeMode = () =>
  useSyncExternalStore(subscribe, () => (root().classList.contains('dark') ? 'dark' : 'light'));

/** A live TILE preview island: `<TileDemo id='buttons' client:only='react' />`. */
export const TileDemo = ({ id }: { id: string }) => {
  const themeMode = useThemeMode();
  const Preview = PREVIEWS[id];
  if (!Preview) {
    throw new Error(`No TILE preview "${id}"`);
  }

  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode} resourceExtensions={translations}>
      <Preview />
    </Theme.Provider>
  );
};
