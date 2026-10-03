//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from '#meta';
import { Frame, Lightbox, MediaArtifact, Storyboard, Variant } from '#types';

export const translations = [
  // The request form's own strings (ref pickers, comboboxes) render inside the studio's articles.
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(MediaArtifact.MediaArtifact)]: {
        'typename.label': 'Media artifact',
        'typename.label_zero': 'Media artifacts',
        'typename.label_one': 'Media artifact',
        'typename.label_other': 'Media artifacts',
        'object-name.placeholder': 'New artifact',
        'add-object.label': 'Add artifact',
        'rename-object.label': 'Rename artifact',
        'delete-object.label': 'Delete artifact',
        'object-deleted.label': 'Artifact deleted',
      },
      [Type.getTypename(Variant.Variant)]: {
        'typename.label': 'Variant',
        'typename.label_other': 'Variants',
      },
      [Type.getTypename(Lightbox.Lightbox)]: {
        'typename.label': 'Lightbox',
        'typename.label_zero': 'Lightboxes',
        'typename.label_one': 'Lightbox',
        'typename.label_other': 'Lightboxes',
        'object-name.placeholder': 'New lightbox',
        'add-object.label': 'Add lightbox',
        'rename-object.label': 'Rename lightbox',
        'delete-object.label': 'Delete lightbox',
        'object-deleted.label': 'Lightbox deleted',
      },
      [Type.getTypename(Storyboard.Storyboard)]: {
        'typename.label': 'Storyboard',
        'typename.label_zero': 'Storyboards',
        'typename.label_one': 'Storyboard',
        'typename.label_other': 'Storyboards',
        'object-name.placeholder': 'New storyboard',
        'add-object.label': 'Add storyboard',
        'rename-object.label': 'Rename storyboard',
        'delete-object.label': 'Delete storyboard',
        'object-deleted.label': 'Storyboard deleted',
      },
      [Type.getTypename(Frame.Frame)]: {
        'typename.label': 'Frame',
        'typename.label_zero': 'Frames',
        'typename.label_one': 'Frame',
        'typename.label_other': 'Frames',
        'object-name.placeholder': 'New frame',
      },
      [meta.profile.key]: {
        'plugin.name': 'Studio',
        'generate.label': 'Generate',
        'generating.label': 'Generating…',
        'create.label': 'Create artifact',
        'generate-error.title': 'Generation failed',
        'close.label': 'Close',
        'artifact-toolbar.menu': 'Artifact toolbar',
        'variants-toolbar.menu': 'Variants toolbar',
        'all.tab.label': 'All',
        'draft.label': 'Draft',
        'cover.label': 'Use as cover',
        'name.placeholder': 'Name',
        'empty.message': 'No variants yet.',
        'more.label': 'More',
        'delete.label': 'Delete artifact',
        'delete-variant.label': 'Delete variant',
        'add-artifact.label': 'Add artifact',
        'add-artifact.error.title': 'Could not add the artifact to the project.',
        'append-frame.label': 'Append frame',
        'delete-frame.label': 'Delete frame',
        'frame.placeholder': 'Untitled frame',
        'frame-preview.label': 'Frame {{index}}',
        'frame-companion.label': 'Frame',
        'frame-empty.message': 'No artifact yet.',
        'add-frame-artifact.label': 'Add artifact',
        'storyboard-empty.message': 'No frames',
        'play.label': 'Play',
        'upload-file.label': 'Upload file',
        'stop.label': 'Back to frames',
        'previous-frame.label': 'Previous frame',
        'next-frame.label': 'Next frame',
        'nothing-to-play.message': 'No generated frames to play yet.',
        'center.label': 'Center',
        'zoom.label': 'Toggle zoom',
        'generator.placeholder': 'Generator',
      },
    },
  },
] as const satisfies Resource[];
