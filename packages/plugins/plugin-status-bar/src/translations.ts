//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { STATUS_BAR_PLUGIN } from './meta';

// TODO(wittjosiah): There's got to be a better way to do typesafe translations, this is too much boilerplate.

type StatusBarTranslationKeys =
  | 'plugin name'
  | 'warning title'
  | 'technology preview message'
  | 'learn more label'
  | 'released message'
  | 'see release label'
  | 'powered by dxos message'
  | 'discord label'
  | 'github label'
  | 'feedback label';

type RequiredTranslation = { [key in StatusBarTranslationKeys]: string };
type TranslationEntry = { [STATUS_BAR_PLUGIN]: RequiredTranslation };

const entry = (translation: RequiredTranslation): TranslationEntry => ({ [STATUS_BAR_PLUGIN]: translation });

export const translations = [
  {
    'en-US': entry({
      'plugin name': 'Status Bar',
      'warning title': 'WARNING',
      'technology preview message': 'Composer is currently in beta.',
      'learn more label': 'Learn more',
      'released message': 'This version released {{released}}.',
      'see release label': 'See release on GitHub',
      'powered by dxos message': 'Powered by <dxos>DXOS</dxos>',
      'discord label': 'Discord',
      'github label': 'GitHub',
      'feedback label': 'Feedback',
    }),
  },
] as const satisfies Resource[];
