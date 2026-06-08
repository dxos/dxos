//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type ChatPresetsProps } from '../components/ChatPrompt/ChatPresets';
import { type AiServicePreset, AiServicePresets } from '../processor';

export type UsePresets = {
  preset: AiServicePreset | undefined;
  presets: ChatPresetsProps['presets'];
  onPresetChange: ChatPresetsProps['onChange'];
};

export const usePresets = (online: boolean): UsePresets => {
  // TODO(burdon): Memo preset for provider.
  const [preset, setPreset] = useState<AiServicePreset>();
  const presets = useMemo(
    () => AiServicePresets.filter((preset) => online === (preset.provider === 'dxos-remote')),
    [online],
  );
  const presetOptions = useMemo(
    () => presets.map(({ id, model, label }) => ({ id, label: label ?? model })),
    [presets],
  );
  useEffect(() => {
    setPreset(presets[0]);
  }, [presets]);

  const handlePresetChange = useCallback<NonNullable<ChatPresetsProps['onChange']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset) {
        setPreset(preset);
      }
    },
    [presets],
  );

  return {
    preset: preset,
    presets: presetOptions,
    onPresetChange: handlePresetChange,
  };
};
