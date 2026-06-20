//
// Copyright 2023 DXOS.org
//

/**
 * Determines whether the on-screen keyboard will appear on `focus` outside of a click handler.
 */
export const hasIosKeyboard = () => {
  // TODO(burdon): Better way to detect iOS keyboard?
  return !!navigator.userAgent.match(/iP(ad|od|hone).+Safari/);
};
