//
// Copyright 2023 DXOS.org
//

import type {
  Plugin,
  GraphBuilderProvides,
  IntentResolverProvides,
  LayoutProvides,
  LocationProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type Label } from '@dxos/react-ui';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

// TODO(wittjosiah): Include a predicate for whether the panel is visible for the current subject.
export type Panel = { id: string; label: Label; icon: string };

// TODO(wittjosiah): Is this generic enough to be in the app framework?
export type PanelProvides = {
  complementary: {
    panels: Panel[];
  };
};

export const parsePanelPlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).complementary?.panels) ? (plugin as Plugin<PanelProvides>) : undefined;

export type DeckSettingsProps = {
  showHints: boolean;
  customSlots: boolean;
  flatDeck: boolean;
  enableNativeRedirect: boolean;
  disableDeck: boolean;
  newPlankPositioning: NewPlankPositioning;
  overscroll: Overscroll;
};

export type DeckPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<DeckSettingsProps> &
  LayoutProvides &
  LocationProvides;
