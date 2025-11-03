//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type FrameProps, ReadonlyTextBox, TextBox } from '../components';
import { type Polygon } from '../types';

export const DefaultFrameComponent = ({ debug, shape, editing, onClose, onCancel }: FrameProps) => {
  if (editing) {
    return <TextBox value={shape.text} centered onEnter={onClose} onCancel={onCancel} />;
  }

  return <ReadonlyTextBox classNames={debug && 'font-mono text-xs'} value={getLabel(shape, debug)} />;
};

const getLabel = (shape: Polygon, debug = false) =>
  debug ? [shape.id, shape.type, `(${shape.center.x},${shape.center.y})`].join('\n') : (shape.text ?? shape.id);
