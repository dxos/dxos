//
// Copyright 2025 DXOS.org
//

/** Preset option shown in the chat prompt's model selector. */
export type AiPreset = {
  id: string;
  label: string;
  /** Served on this device (a local runtime), so an agent running on EDGE cannot use it. */
  local?: boolean;
  /** The model vendor's logo. */
  icon?: string;
};

export type ChatPresetProps = {
  presets?: AiPreset[];
  preset?: string;
  onPresetChange?: (id: string) => void;
};
