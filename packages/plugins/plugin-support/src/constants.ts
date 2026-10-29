//
// Copyright 2023 DXOS.org
//

import { SupportNamespace } from './namespace.ts';

export const WELCOME_TOUR_ID = `${SupportNamespace.key}.tour.welcome`;

export const SHORTCUTS_DIALOG = `${SupportNamespace.key}.ShortcutsDialog`;

/** The About dialog: the help menu opens it, and the onboarding plugin contributes it. */
export const ABOUT_DIALOG = `${SupportNamespace.key}.component.about-dialog`;

export const DXOS_GUILD_ID = '837138313172353095';

export const DEFAULT_TEAM = new Set<string>(['Rich', 'Josiah', 'Mykola', 'Dmytro']);
