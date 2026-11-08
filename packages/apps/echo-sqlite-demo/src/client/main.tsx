//
// Copyright 2026 DXOS.org
//

// Both are needed, and they are not alternatives.
//
// `@dxos-theme` is ThemePlugin's VIRTUAL module: in a monorepo checkout the plugin serves its own
// `workspace.css` there, and that is what carries the Tailwind UTILITIES. Importing
// `@dxos/react-ui/theme.css` alone yields a stylesheet with no utilities at all.
//
// `@dxos/react-ui/theme.css` is react-ui's own COMPONENT css — `.dx-panel`'s grid, `.dx-toolbar`,
// icon sizing. The theme package ships only callout/focus/scrollbar/state/surface/text, so without
// this a Panel computes `display: block` and nothing is laid out.
import '@dxos-theme';

import { RegistryContext } from '@effect/atom-react';
import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxos/react-ui/theme.css';
import { DatabaseBusyError, DatabaseUnavailableError, openDatabase, resolveSlug } from '@dxos/echo-worker';
import * as AtomEx from '@dxos/effect/AtomEx';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as menuTranslations } from '@dxos/react-ui-menu/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { types } from '../schema.ts';
import { App } from './components/index.ts';

/** Without these the design system's own labels render as raw keys ("save-button.label"). */
const translations = [...uiTranslations, ...formTranslations, ...menuTranslations, ...tableTranslations];

/** The table's column state lives in atoms, which need a registry. */
const registry = AtomEx.makeRegistry();

const root = createRoot(document.getElementById('root')!);

const render = (children: React.ReactNode) =>
  root.render(
    <RegistryContext.Provider value={registry}>
      <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
        {children}
      </Theme.Provider>
    </RegistryContext.Provider>,
  );

// The slug names the graph; `/` mints one and rewrites the URL so the address is shareable.
const slug = resolveSlug();

// Opening reads only the persisted type rows, so it costs the same at any space size.
openDatabase(slug, types).then(
  ({ db }) => render(<App db={db} slug={slug} />),
  (error) => {
    console.error(error);
    render(
      <div className='p-4 space-y-2'>
        <p className='text-fg'>
          {error instanceof DatabaseBusyError ? 'The app is open in another tab.' : 'Could not open the database.'}
        </p>
        <p className='text-fg-muted text-sm'>
          {error instanceof DatabaseBusyError
            ? 'One tab at a time holds this browser’s database, whichever graph it shows. Close the other tab and reload this one; to watch two peers sync, open the second in another browser or profile.'
            : error instanceof DatabaseUnavailableError
              ? 'The worker never got the file. A private window may block origin storage, and some browsers keep the handle for a moment after a tab holding it closes — reloading often works.'
              : 'This demo needs OPFS in a dedicated worker. It works in Chrome, Edge and Safari 17+; a private window may block origin storage.'}
        </p>
        {!(error instanceof DatabaseBusyError) && !(error instanceof DatabaseUnavailableError) && (
          <pre className='text-fg-subtle text-xs overflow-x-auto'>{String(error)}</pre>
        )}
      </div>,
    );
  },
);
