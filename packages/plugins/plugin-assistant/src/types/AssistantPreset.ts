//
// Copyright 2025 DXOS.org
//

/** Preset option shown in the chat prompt's model selector. */
export type AiPreset = {
  id: string;
  label: string;
};

/** Props shared between the ChatPresets component and the usePresets hook. */
export type ChatPresetProps = {
  presets?: AiPreset[];
  preset?: string;
  onPresetChange?: (id: string) => void;
};
