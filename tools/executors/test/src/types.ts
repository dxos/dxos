//
// Copyright 2022 DXOS.org
//

export const BrowserTypes = ['chromium', 'firefox', 'webkit'] as const;

export type BrowserType = (typeof BrowserTypes)[number];

export const MobileTypes = ['ios', 'android'] as const;

export type MobileType = (typeof MobileTypes)[number];

// TODO(wittjosiah): Include 'browser' type to align with platform comments.
export const TestEnvironments = ['nodejs', ...BrowserTypes, ...MobileTypes] as const;

export type TestEnvironment = (typeof TestEnvironments)[number];
