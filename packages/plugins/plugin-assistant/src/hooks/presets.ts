//
// Copyright 2025 DXOS.org
//

import {
  type AiServiceLayer,
  DirectAiServiceLayer,
  LocalEdgeAiServiceLayer,
  RemoteEdgeAiServiceLayer,
} from '@dxos/ai/testing';

export type AiServicePreset = 'direct' | 'edge-local' | 'edge-remote';

// TODO(burdon): Users should be able to create presets.
export const AiServicePresets: { id: AiServicePreset; label: string; layer: AiServiceLayer }[] = [
  {
    id: 'direct',
    label: 'Direct',
    layer: DirectAiServiceLayer,
  },
  {
    id: 'edge-local',
    label: 'Local',
    layer: LocalEdgeAiServiceLayer,
  },
  {
    id: 'edge-remote',
    label: 'EDGE',
    layer: RemoteEdgeAiServiceLayer,
  },
] as const;
