//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Deck',
        'settings title': 'Deck settings',
        'main header label': 'Main header',
        'open navigation sidebar label': 'Open sidebar',
        'collapse navigation sidebar label': 'Minimize sidebar',
        'open complementary sidebar label': 'Open context sidebar',
        'close complementary sidebar label': 'Minimize context sidebar',
        'sidebar title': 'Navigation sidebar',
        'complementary sidebar title': 'Context sidebar',
        'plugin error message': 'Content failed to render.',
        'content fallback message': 'Unsupported',
        'content fallback description':
          'No plugin had a response for the address you navigated to. Double-check the URL, and ensure you’ve enabled a plugin that supports the object.',
        'toggle fullscreen label': 'Toggle fullscreen',
        'settings show hints label': 'Show hints',
        'settings native redirect label': 'Enable native url redirect (experimental)',
        'settings new plank position start label': 'Start',
        'settings new plank position end label': 'End',
        'select new plank positioning placeholder': 'Select new plank positioning',
        'select new plank positioning label': 'New plank positioning',
        'undo available label': 'Click to undo previous action.',
        'undo action label': 'Undo',
        'undo action alt': 'Undo previous action',
        'undo close label': 'Dismiss',
        'error fallback message': 'Unable to open this item',
        'plank heading fallback label': 'Untitled',
        'actions menu label': 'Options',
        'settings deck label': 'Disable deck',
        'pending heading': 'Loading…',
        'insert plank label': 'Open',
        'resize label': 'Drag to resize',
        'pin start label': 'Pin to the left sidebar',
        'pin end label': 'Pin to the right sidebar',
        'increment start label': 'Move to the left',
        'increment end label': 'Move to the right',
        'show deck plank label': 'Return to deck',
        'show solo plank label': 'Maximize',
        'exit fullscreen label': 'Exit fullscreen',
        'show fullscreen plank label': 'Fullscreen',
        'close label': 'Close',
        'minify label': 'Minify',
        'open companion label': 'Open companion',
        'close companion label': 'Close companion',
        'settings overscroll label': 'Plank scrolling',
        'select overscroll placeholder': 'Select plank scrolling behavior',
        'settings overscroll centering label': 'Centering',
        'settings overscroll none label': 'None',
        'settings enable statusbar label': 'Show status bar',
        'settings enable deck label': 'Enable Deck',
        'settings encapsulated planks label': 'Encapsulated planks',
        'close current label': 'Close current plank',
        'close others label': 'Close other planks',
        'close all label': 'Close all planks',
        'companion plank heading fallback label': 'Related',
      },
    },
  },
] as const satisfies Resource[];
