/**
 * Checks if process NODE_ENV in 'development' mode
 */
// TODO(burdon): Does this comment have to come first?
//
// Copyright 2021 DXOS.org
//

export const inDev = (): boolean => process.env.NODE_ENV === 'development';

export const inFullScreenMode = (): boolean => window.location.href.includes('popup/fullscreen.html');
