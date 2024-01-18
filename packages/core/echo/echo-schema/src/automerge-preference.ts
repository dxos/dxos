//
// Copyright 2024 DXOS.org
//

/**
 * When no env or global overrides are set, this is the default.
 */

const DEFAULT_AUTOMERGE_PREFERENCE = true;

// TODO(dmaretskyi): Remove once migration is complete.
let globalAutomergePreference: boolean | undefined;

/**
 * @deprecated Temporary.
 */
export const setGlobalAutomergePreference = (useAutomerge: boolean) => {
  globalAutomergePreference = useAutomerge;
};

/**
 * @deprecated Temporary.
 */
export const getGlobalAutomergePreference = () => {
  // TODO(burdon): Factor out.
  const isSet = (value?: string) => (value !== undefined ? /^(true|1)$/i.test(value) : undefined);

  const value =
    globalAutomergePreference ??
    // TODO(burdon): DX_ is the standard prefix.
    (globalThis as any).DXOS_FORCE_AUTOMERGE ??
    isSet((globalThis as any).process?.env?.DXOS_FORCE_AUTOMERGE) ??
    DEFAULT_AUTOMERGE_PREFERENCE;

  return value;
};
