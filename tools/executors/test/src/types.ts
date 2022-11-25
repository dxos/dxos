//
// Copyright 2022 DXOS.org
//

export const BrowserTypes = ['chromium', 'firefox', 'webkit'] as const;

export type BrowserType = typeof BrowserTypes[number];

// TODO(wittjosiah): Include 'browser' type to align with platform comments.
export const TestEnvironments = ['nodejs', ...BrowserTypes] as const;

export type TestEnvironment = typeof TestEnvironments[number];
