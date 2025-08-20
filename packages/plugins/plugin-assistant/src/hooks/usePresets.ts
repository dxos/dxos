//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type ChatPromptProps } from '../components';

import { type AiServicePreset, AiServicePresets } from './presets';

export type UsePresets = {
  preset: AiServicePreset | undefined;
} & Pick<ChatPromptProps, 'presets' | 'onPresetChange'>;

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

  const handlePresetChange = useCallback<NonNullable<ChatPromptProps['onPresetChange']>>(
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
