//
// Copyright 2025 DXOS.org
//

import { useEditorContext } from './useEditorContext';
import { type ShapeDef } from '../components';

export const useShapeDef = (type: string): ShapeDef | undefined => {
  const { registry } = useEditorContext();
  return registry.getShapeDef(type);
};
