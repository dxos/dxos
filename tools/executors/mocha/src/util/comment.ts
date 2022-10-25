//
// Copyright 2022 DXOS.org
//

/**
 * Comment used within a test file to indicate it should only be loaded in a specific platform.
 *
 * By convention is included at the top of a file underneath the copyright.
 * This is not enforced however and the whole file is checked for the string.
 */
export const mochaComment = (platform: 'nodejs' | 'browser') =>
  `// @dxos/mocha platform=${platform}`;
