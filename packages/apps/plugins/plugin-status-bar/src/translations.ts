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
  | 'name placeholder';

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
    'email input placeholder': 'your-email@example.com',
    'feedback text area label': 'Feedback',
    'feedback text area placeholder': 'Experienced an issue? Have a suggestion? Let us know!',
    'send feedback label': 'Send Feedback',
  }),
};

export default [translations];
