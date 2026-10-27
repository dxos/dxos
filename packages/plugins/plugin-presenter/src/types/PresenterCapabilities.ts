//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as Presentation from './Presentation.ts';
import type * as PresenterSettings from './PresenterSettings.ts';

/** The presenter's settings (where speaker notes show). */
export const Settings = Capability.makeSingleton<Atom.Writable<PresenterSettings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** The slide on screen while a presentation is presented. */
export type SlideEvent = {
  presentation: Presentation.Presentation;
  /** The Slide, when the deck is a Presentation's (a previewed document's slides have none). */
  slide?: Presentation.Slide;
  /** Id of the slide source (the Slide's id for a Presentation). */
  id: string;
  /** The slide's label: its title, else its first heading. */
  title?: string;
  /** Position among the presented (not hidden) slides. */
  index: number;
  /** Click steps revealed on the slide. */
  step: number;
};

/**
 * Callbacks fired by a presented deck, so another plugin (a recorder, a timer) can follow the presentation without
 * the presenter depending on it.
 */
export type PresentationEventHandler = {
  /** The presentation entered fullscreen. */
  onStart?: (presentation: Presentation.Presentation) => void;
  /** The slide or click step on screen changed (also fired once after `onStart`). */
  onSlide?: (event: SlideEvent) => void;
  /** The presentation left fullscreen. */
  onStop?: (presentation: Presentation.Presentation) => void;
};

export const PresentationEventHandler = Capability.make<PresentationEventHandler>()(
  `${meta.profile.key}.capability.presentationEventHandler`,
);
