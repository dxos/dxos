//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import sprite from 'virtual:autocue-icons';

import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';

import { Player, type PlayerView } from '../src/player/Player.tsx';
import { sampleManifest } from '../src/player/testing/sample.ts';
import { type Manifest } from '../src/player/types.ts';

// The icon registry loads its sprite from `/icons.svg` at the site root, which a bundle under an R2 prefix or inside an
// Artifact does not have; the page carries the few icons it uses and answers that one request itself.
const fetchNetwork = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  String(input) === '/icons.svg'
    ? Promise.resolve(new Response(sprite, { headers: { 'content-type': 'image/svg+xml' } }))
    : fetchNetwork(input, init);

/** The manifest `pack.mjs` wrote into the page, or the example data while developing the player. */
const readManifest = (): Manifest => {
  const text = document.getElementById('autocue-manifest')?.textContent?.trim() ?? '';
  if (text.startsWith('{{') || !text) {
    return sampleManifest;
  }
  // Written by pack.mjs from the same types, so it is not re-validated here.
  const manifest: Manifest = JSON.parse(text);
  return manifest;
};

const VIEW_KEY = 'autocue:view';
const readView = (): PlayerView | undefined => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'spec' ? 'spec' : undefined;
  } catch {
    return undefined;
  }
};

/** Dark unless the viewer chose light: the OS setting, overridden by a host's `data-theme` (Claude Artifacts set one). */
const isDark = () => {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const useThemeMode = () => {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => {
      document.documentElement.classList.toggle('dark', isDark());
      setDark(isDark());
    };
    update();
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      query.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);
  return dark ? 'dark' : 'light';
};

const App = ({ manifest }: { manifest: Manifest }) => {
  const themeMode = useThemeMode();
  return (
    <Theme.Provider tx={Theme.defaultTx} themeMode={themeMode}>
      <Player
        manifest={manifest}
        initialDemo={location.hash.slice(1) || undefined}
        onDemoChange={(id) => history.replaceState(null, '', `#${id}`)}
        initialView={readView()}
        onViewChange={(view) => {
          try {
            localStorage.setItem(VIEW_KEY, view);
          } catch {}
        }}
      />
    </Theme.Provider>
  );
};

const manifest = readManifest();
document.title = manifest.title;
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App manifest={manifest} />);
}
