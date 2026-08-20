//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Language, Vocabulary, Word } from '#types';

export const translations = [
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
        'typename.label': 'Vocabulary',
        'typename.label_zero': 'Vocabulary decks',
        'typename.label_one': 'Vocabulary deck',
        'typename.label_other': 'Vocabulary decks',
        'object-name.placeholder': 'New vocabulary deck',
        'add-object.label': 'Add vocabulary deck',
        'rename-object.label': 'Rename vocabulary deck',
        'delete-object.label': 'Delete vocabulary deck',
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
        'reader-companion.label': 'Language view',

        // Vocabulary article.
        'order.label': 'Order',
        'order-deck.label': 'Deck order',
        'order-due.label': 'Due first',
        'order-weakest.label': 'Weakest first',
        'untitled-deck.label': 'Untitled deck',

        // Flashcards.
        'reveal.button': 'Reveal',
        'correct.button': 'Got it',
        'incorrect.button': 'Missed it',
        'restart.label': 'Restart session',
        'empty-deck.message': 'This deck has no words yet.',
        'session-complete.message': 'Session complete.',
        'session-score.message': '{{correct}} of {{answered}} correct',
        'record-review-error.message': 'Failed to record the answer.',

        // Reader.
        'mode.label': 'View',
        'mode-original.label': 'Original',
        'mode-translation.label': 'Translation',
        'mode-split.label': 'Split',
        'deck.label': 'Deck',
        'extract.label': 'Extract vocabulary',
        'add-word.label': 'Add to deck',
        'unknown-word.message': 'Not in your vocabulary yet.',
        'no-text.message': 'This object has no readable text.',
        'extract-error.message': 'Failed to extract vocabulary.',
        'translate-error.message': 'Failed to translate the term.',
        'add-word-error.message': 'Failed to add the word.',

        // Settings.
        'settings.reveal-mode.label': 'Reader mode',
      },
    },
  },
] as const satisfies Resource[];
