//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { type Gallery } from '../types';
import { DescribeImage } from './definitions';

// Placeholder descriptions until the AI service supports image-to-text natively.
// TODO(burdon): Replace with a vision-model call once @dxos/ai exposes an image input.
const PLACEHOLDER_DESCRIPTIONS = [
  'A photograph with soft, diffused lighting.',
  'A high-contrast composition with a clear focal subject.',
  'A wide landscape shot with gentle gradients of color.',
  'A close-up image with rich detail and shallow depth of field.',
  'An abstract pattern of repeating geometric shapes.',
  'A candid scene captured in warm afternoon light.',
];

const handler: Operation.WithHandler<typeof DescribeImage> = DescribeImage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ gallery, index }) {
      const obj = (yield* Database.load(gallery)) as Gallery.Gallery;
      const images = obj.images ?? [];
      if (index < 0 || index >= images.length) {
        return { description: '' };
      }

      const description = PLACEHOLDER_DESCRIPTIONS[index % PLACEHOLDER_DESCRIPTIONS.length];

      Obj.change(obj, (obj) => {
        const next = [...(obj.images ?? [])];
        next[index] = { ...next[index], description };
        obj.images = next;
      });

      return { description };
    }),
  ),
);

export default handler;
