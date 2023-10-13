//
// Copyright 2023 DXOS.org
//

// https://docs.dndkit.com/api-documentation/draggable/usedraggable#transform

import { CSS, type Transform } from '@dnd-kit/utilities';

export const getTransformCSS = (transform: Transform | null) =>
  transform ? CSS.Transform.toString(Object.assign(transform, { scaleX: 1, scaleY: 1 })) : undefined;
