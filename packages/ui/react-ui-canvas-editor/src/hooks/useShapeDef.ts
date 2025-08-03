//
// Copyright 2025 DXOS.org
//

import { type ShapeDef } from '../components';

import { useEditorContext } from './useEditorContext';

export const useShapeDef = (type: string): ShapeDef | undefined => {
  const { registry } = useEditorContext();
  return registry.getShapeDef(type);
};
