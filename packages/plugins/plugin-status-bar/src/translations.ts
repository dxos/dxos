//
// Copyright 2023 DXOS.org
//

import { type useTranslation } from '@dxos/react-ui';

import { STATUS_BAR_PLUGIN } from './meta';

type StatusBarTranslationKeys =
  | 'plugin name'
  | 'email input label'
  | 'email input placeholder'
  | 'feedback text area label'
  | 'feedback text area placeholder'
  | 'send feedback label'
  | 'name label'
  | 'name placeholder'
  | 'warning title'
  | 'technology preview message'
  | 'learn more label'
  | 'released message'
  | 'see release label'
  | 'powered by dxos message'
  | 'discord label'
  | 'feedback label';

type RequiredTranslation = { [key in StatusBarTranslationKeys]: string };
type TranslationEntry = { [STATUS_BAR_PLUGIN]: RequiredTranslation };
type Language = string;

// -- helpers.
const entry = (translation: RequiredTranslation): TranslationEntry => ({ [STATUS_BAR_PLUGIN]: translation });
export const mkTranslation = (t: ReturnType<typeof useTranslation>['t']) => (key: StatusBarTranslationKeys) => t(key);

const translations: Record<Language, TranslationEntry> = {
  'en-US': entry({
    'plugin name': 'Status Bar',
    'name label': 'Name',
    'name placeholder': 'Preferred name',
    'email input label': 'Email',
    'email input placeholder': 'hello@example.com',
    'feedback text area label': 'Feedback',
    'feedback text area placeholder': 'Please describe your issue or suggestion.',
    'send feedback label': 'Send Feedback',
    'warning title': 'WARNING',
    'technology preview message': 'Composer is currently in beta.',
    'learn more label': 'Learn more',
    'released message': 'This version released {{released}}.',
    'see release label': 'See release on GitHub',
    'powered by dxos message': 'Powered by <dxos>DXOS</dxos>',
    'discord label': 'Discord',
    'feedback label': 'Feedback',
  }),
};

export default [translations];
