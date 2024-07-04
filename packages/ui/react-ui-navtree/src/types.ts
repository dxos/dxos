//
// Copyright 2023 DXOS.org
//

/**
 * Platform-specific key binding.
 */
// NOTE: Keys come from `getHostPlatform` in `@dxos/util`.
// TODO(thure): Dedupe (similar in react-ui-deck)
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};
