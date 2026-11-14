//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import { RegistryProvider } from '@effect/atom-react/RegistryContext';
import React, { type ComponentType, useSyncExternalStore } from 'react';

import '@dxos/react-ui/theme.css';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as menuTranslations } from '@dxos/react-ui-menu/translations';
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
import { MarkdownEditor, NotesEditor, SharedEditorPreview } from '../echo/snippets/tile-guide-editor.tsx';
import { NewContact } from '../echo/snippets/tile-guide-forms.tsx';
import { Agenda, FolderTree, PeopleListbox } from '../echo/snippets/tile-guide-lists.tsx';
import { FormatToolbar, RowMenu, ViewToolbar } from '../echo/snippets/tile-guide-menus.tsx';
import { ContactsScreen as IconsScreen } from '../tile-tutorial/icons/ContactsScreen.tsx';
import { translations as contactsTranslations } from '../tile-tutorial/icons/translations.ts';
import { ContactsScreen as InputsScreen } from '../tile-tutorial/inputs/ContactsScreen.tsx';
import { ContactsScreen as LayoutScreen } from '../tile-tutorial/layout/ContactsScreen.tsx';
import { ContactsScreen as OverlaysScreen } from '../tile-tutorial/overlays/ContactsScreen.tsx';
import { App as ThemeApp } from '../tile-tutorial/theme/App.tsx';

/** The previews a page can show, by id; each is the snippet the page prints beside it. */
const PREVIEWS: Record<string, ComponentType> = {
  'agenda': Agenda,
  'buttons': Buttons,
  'dialog': EditDialog,
  'editor-markdown': MarkdownEditor,
  'editor-plain': NotesEditor,
  'editor-shared': SharedEditorPreview,
  'folder-tree': FolderTree,
  'form-new-contact': NewContact,
  'format-toolbar': FormatToolbar,
  'icons': Icons,
  'inputs': Inputs,
  'learn-icons': IconsScreen,
  'learn-inputs': InputsScreen,
  'learn-layout': LayoutScreen,
  'learn-overlays': OverlaysScreen,
  'learn-theme': ThemeApp,
  'menu': ContactMenu,
  'panel': ContactsPanel,
  'people-listbox': PeopleListbox,
  'popover': SharePopover,
  'row-menu': RowMenu,
  'sizes': Sizes,
  'status': States,
  'toast': SavedToast,
  'tooltip': SaveTooltip,
  'view-toolbar': ViewToolbar,
};

const RESOURCES = [
  ...translations,
  ...editorTranslations,
  ...formTranslations,
  ...menuTranslations,
  ...contactsTranslations,
];

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
    <RegistryProvider>
      <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode} resourceExtensions={RESOURCES}>
        <Preview />
      </Theme.Provider>
    </RegistryProvider>
  );
};
