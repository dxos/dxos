//
// Copyright 2023 DXOS.org
//

export const hasIosKeyboard = () => {
  // TODO(thure): UA sniffing is never good, however I haven’t found a better way to query for whether the on-screen keyboard will appear on `focus` outside of a click handler.
  return !!navigator.userAgent.match(/(iPad|iPod|iPhone).+Safari/);
};
