//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as menuTranslations } from '@dxos/react-ui-menu/translations';

import { meta } from '#meta';
import { Language, Vocabulary, Word } from '#types';

export const translations = [
  // The reader toolbar overflows into a menu, which labels itself from this bundle; without it the
  // control renders its raw i18n key.
  ...menuTranslations,
  {
    'en-US': {
      [Type.getTypename(Language.Language)]: {
        'typename.label': 'Language',
        'typename.label_zero': 'Languages',
        'typename.label_one': 'Language',
        'typename.label_other': 'Languages',
        'object-name.placeholder': 'New language',
        'add-object.label': 'Add language',
        'rename-object.label': 'Rename language',
        'delete-object.label': 'Delete language',
      },
      [Type.getTypename(Vocabulary.Vocabulary)]: {
        'typename.label': 'Word list',
        'typename.label_zero': 'Word lists',
        'typename.label_one': 'Word list',
        'typename.label_other': 'Word lists',
        'object-name.placeholder': 'New word list',
        'add-object.label': 'Add word list',
        'rename-object.label': 'Rename word list',
        'delete-object.label': 'Delete word list',
      },
      [Type.getTypename(Word.Word)]: {
        'typename.label': 'Word',
        'typename.label_zero': 'Words',
        'typename.label_one': 'Word',
        'typename.label_other': 'Words',
      },
      [meta.profile.key]: {
        'plugin.name': 'Lingo',

        // Companions.
        'flashcards-companion.label': 'Flashcards',
        'reader-companion.label': 'Translation',

        // Vocabulary article.
        'order.label': 'Order',
        'order-deck.label': 'List order',
        'order-due.label': 'Due first',
        'order-weakest.label': 'Weakest first',
        'untitled-deck.label': 'Untitled list',

        // Flashcards.
        'reveal.button': 'Reveal',
        'correct.button': 'Got it',
        'incorrect.button': 'Missed it',
        'restart.label': 'Restart session',
        'empty-deck.message': 'This list has no words yet.',
        'session-complete.message': 'Session complete.',
        'session-score.message': '{{correct}} of {{answered}} correct',
        'record-review-error.message': 'Failed to record the answer.',

        // Reader.
        'mode.label': 'View',
        'mode-original.label': 'Original',
        'mode-translation.label': 'Translation',
        'mode-split.label': 'Split',
        'deck.label': 'Word list',
        'extract.label': 'Extract vocabulary',
        'add-word.label': 'Add word to list',
        'add-phrase.label': 'Add phrase to list',
        'language.label': 'Language',
        'run.label': 'Translate and analyze',
        'delete-translation.label': 'Delete translation',
        'analyze-error.message': 'Failed to analyze the text.',
        'no-text.message': 'This object has no readable text.',
        'not-translated.message': 'Not translated yet.',
        'extract-error.message': 'Failed to extract vocabulary.',
        'translate-error.message': 'Failed to translate the term.',
        'add-word-error.message': 'Failed to add the word.',

        // Settings.
        'settings.reveal-mode.label': 'Reader mode',
      },
    },
  },
] as const satisfies Resource[];
