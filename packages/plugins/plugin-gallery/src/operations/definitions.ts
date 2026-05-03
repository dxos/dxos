//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { meta } from '#meta';

import { Gallery } from '../types';

const GALLERY_OPERATION = `${meta.id}.operation`;

export const DescribeImage = Operation.make({
  meta: {
    key: `${GALLERY_OPERATION}.describe-image`,
    name: 'Describe Image',
    description: 'Generate a textual description for an image at the given index in a Gallery.',
  },
  input: Schema.Struct({
    gallery: Ref.Ref(Gallery.Gallery).annotations({
      description: 'Reference to the Gallery containing the image.',
    }),
    index: Schema.Number.annotations({
      description: 'Index of the image within gallery.images.',
    }),
  }),
  output: Schema.Struct({
    description: Schema.String.annotations({
      description: 'The generated image description.',
    }),
  }),
  services: [Database.Service],
});
