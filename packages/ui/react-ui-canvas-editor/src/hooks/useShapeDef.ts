//
// Copyright 2025 DXOS.org
//

import { type ShapeDef } from '../components/index.ts';
import { useEditorContext } from './useEditorContext.ts';

export const useShapeDef = (type: string): ShapeDef | undefined => {
  const { registry } = useEditorContext();
  return registry.getShapeDef(type);
};
