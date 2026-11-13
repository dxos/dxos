//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import { RegistryProvider } from '@effect/atom-react/RegistryContext';
import React, { type ComponentType, Suspense, lazy, useState } from 'react';

import '@dxos/react-ui/theme.css';
import { translations as calendarTranslations } from '@dxos/react-ui-calendar/translations';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as geoTranslations } from '@dxos/react-ui-geo/translations';
import { translations as menuTranslations } from '@dxos/react-ui-menu/translations';
import { translations as mosaicTranslations } from '@dxos/react-ui-mosaic/translations';
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
import { useNearViewport, useThemeMode } from './hooks.ts';

/** A preview in its own chunk, loaded when its island first renders. */
const lazyPreview = <M,>(load: () => Promise<M>, name: keyof M): ComponentType =>
  // A module's export, named by key, cannot be narrowed to a component by its key type alone.
  lazy(async () => ({ default: (await load())[name] as ComponentType }));

/** The previews a page can show, by id; each is the snippet the page prints beside it. */
const PREVIEWS: Record<string, ComponentType> = {
  'agenda': Agenda,
  'buttons': Buttons,
  'calendar-picker': lazyPreview(() => import('../echo/snippets/tile-guide-calendar.tsx'), 'MonthPicker'),
  'calendar-week': lazyPreview(() => import('../echo/snippets/tile-guide-calendar.tsx'), 'WeekPlanner'),
  'dialog': EditDialog,
  'editor-markdown': MarkdownEditor,
  'editor-plain': NotesEditor,
  'editor-shared': SharedEditorPreview,
  'folder-tree': FolderTree,
  'form-new-contact': NewContact,
  'format-toolbar': FormatToolbar,
  'icons': Icons,
  'inputs': Inputs,
  'kanban': lazyPreview(() => import('../echo/snippets/tile-guide-mosaic.tsx'), 'TaskBoard'),
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
  ...calendarTranslations,
  ...editorTranslations,
  ...formTranslations,
  ...geoTranslations,
  ...menuTranslations,
  ...mosaicTranslations,
  ...contactsTranslations,
];

export type TileDemoProps = {
  id: string;
  /** Mounts the preview, and loads its chunk, only once the island nears the viewport. */
  deferred?: boolean;
};

/** A live TILE preview island: `<TileDemo id='buttons' client:only='react' />`. */
export const TileDemo = ({ id, deferred = false }: TileDemoProps) => {
  const themeMode = useThemeMode();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const near = useNearViewport(element, deferred);
  const Preview = PREVIEWS[id];
  if (!Preview) {
    throw new Error(`No TILE preview "${id}"`);
  }

  return (
    <RegistryProvider>
      <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode} resourceExtensions={RESOURCES}>
        {deferred ? (
          <div className='h-full' ref={setElement}>
            {near && (
              <Suspense>
                <Preview />
              </Suspense>
            )}
          </div>
        ) : (
          <Suspense>
            <Preview />
          </Suspense>
        )}
      </Theme.Provider>
    </RegistryProvider>
  );
};
