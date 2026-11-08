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

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxos/react-ui/theme.css';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as menuTranslations } from '@dxos/react-ui-menu/translations';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { App } from './App.tsx';
import { openDatabase } from './database.ts';
import { resolveSlug } from './slug.ts';

/** Without these the design system's own labels render as raw keys ("save-button.label"). */
const translations = [...uiTranslations, ...formTranslations, ...menuTranslations];

const root = createRoot(document.getElementById('root')!);

const render = (children: React.ReactNode) =>
  root.render(
    <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
      {children}
    </Theme.Provider>,
  );

// The slug names the graph; `/` mints one and rewrites the URL so the address is shareable.
const slug = resolveSlug();

// Opening reads only the persisted type rows, so it costs the same at any space size.
openDatabase(slug).then(
  ({ db }) => render(<App db={db} slug={slug} />),
  (error) => {
    console.error(error);
    render(
      <div className='p-4 space-y-2'>
        <p className='text-fg'>Could not open the database.</p>
        <p className='text-fg-muted text-sm'>
          This demo needs OPFS in a dedicated worker. It works in Chrome, Edge and Safari 17+; a private window may
          block origin storage.
        </p>
        <pre className='text-fg-subtle text-xs overflow-x-auto'>{String(error)}</pre>
      </div>,
    );
  },
);
