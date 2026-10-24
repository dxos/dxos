//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Presentation } from '#types';

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
      [meta.profile.key]: {
        'plugin.name': 'Presenter',
        'toggle-presentation.label': 'Present',
        'slide-pending.label': 'Loading…',
        'add-slide.label': 'Add slide',
        'fullscreen.label': 'Fullscreen',
        'slide-grid.label': 'Slides',
        'add-section.label': 'Add to presentation',
        'untitled-object.label': 'Untitled {{type}}',
        'slide-fallback.label': 'Slide {{count}}',
        'remove-section.label': 'Remove from presentation',
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
        'layout.image.label': 'Image',
        'layout.image-left.label': 'Image on the left',
        'layout.image-right.label': 'Image on the right',
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
      },
    },
  },
] as const satisfies Theme.Resource[];
