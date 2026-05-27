//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref, DXN } from '@dxos/echo';

import { meta } from '#meta';

import * as Gallery from './Gallery';

const GALLERY_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const DescribeImage = Operation.make({
  meta: {
    key: DXN.make(`${GALLERY_OPERATION}.describeImage`),
    name: 'Describe Image',
    description: 'Generate a textual description for an image at the given index in a Gallery.',
    icon: 'ph--image--regular',
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
