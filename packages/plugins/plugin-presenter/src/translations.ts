//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { Presentation } from '#types';

import { PresenterNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Presentation.Presentation)]: {
        'typename.label': 'Presentation',
        'typename.label_zero': 'Presentations',
        'typename.label_one': 'Presentation',
        'typename.label_other': 'Presentations',
        'object-name.placeholder': 'New presentation',
        'add-object.label': 'Add presentation',
        'rename-object.label': 'Rename presentation',
        'delete-object.label': 'Delete presentation',
        'object-deleted.label': 'Presentation deleted',
      },
      [PresenterNamespace.key]: {
        'plugin.name': 'Presenter',
        'toggle-presentation.label': 'Present',
        'slide-pending.label': 'Loading...',
        'theme-group.label': 'Theme',
        'theme-color.placeholder': 'From theme',
        'default-font.placeholder': '{{font}} (default)',
        'add-slide.label': 'Add slide',
        'add-slide-layout.label': 'Layout of new slides',
        'slide-grid.label': 'Slides',
        'grid-size-small.label': 'Small thumbnails',
        'grid-size-large.label': 'Large thumbnails',
        'add-section.label': 'Add to presentation',
        'untitled-object.label': 'Untitled {{type}}',
        'slide-fallback.label': 'Slide {{count}}',
        'remove-section.label': 'Remove from presentation',
        'delete-slide.label': 'Delete slide',
        'hide-slide.label': 'Hide slide',
        'show-slide.label': 'Show slide',
        'missing-object.label': 'Missing object',
        'recursive-embed.label': 'Embedded in itself',
        'slide-layout.label': 'Layout',
        'layout.default.label': 'Default',
        'layout.cover.label': 'Cover',
        'layout.center.label': 'Center',
        'layout.section.label': 'Section',
        'layout.intro.label': 'Intro',
        'layout.end.label': 'End',
        'layout.fact.label': 'Fact',
        'layout.statement.label': 'Statement',
        'layout.quote.label': 'Quote',
        'layout.two-cols.label': 'Two columns',
        'layout.two-cols-header.label': 'Titled columns',
        'layout.three-cols.label': 'Three columns',
        'layout.two-by-two.label': 'Two by two',
        'layout.image.label': 'Image',
        'layout.image-left.label': 'Image left',
        'layout.image-right.label': 'Image right',
        'layout.full.label': 'Full bleed',
        'layout.none.label': 'None',
        'insert-click.label': 'Reveal on click',
        'insert-clicks.label': 'Reveal list items one by one',
        'insert-column.label': 'Start the next column',
        'insert-object.label': 'Insert object',
        'slide-background.label': 'Background',
        'background-image.label': 'Image URL',
        'background-video.label': 'Video URL',
        'slide-notes.label': 'Speaker notes',
        'preview-mode.label': 'Preview',
        'preview-split.label': 'Preview below the editor',
        'preview-companion.label': 'Preview in the companion',
        'previous-slide.label': 'Previous slide',
        'next-slide.label': 'Next slide',
        'present-from-here.label': 'Present from this slide',
        'slide-preview.label': 'Slide',
        'slide-position.label': '{{index}} / {{count}}',
        'no-notes.label': 'No speaker notes for this slide.',
        'next-slide-notes.label': 'Next: {{title}}',
        'speaker-notes-window.title': 'Speaker notes: {{name}}',
        'open-speaker-notes.label': 'Open speaker notes',
      },
    },
  },
] as const satisfies Theme.Resource[];
