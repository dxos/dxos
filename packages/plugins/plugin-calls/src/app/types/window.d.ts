//
// Copyright 2024 DXOS.org
//

export {};

declare global {
  interface Window {
    ENV: {
      RELEASE?: string;
      SENTRY_DSN?: string;
    };
  }
}
