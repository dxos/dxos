//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import echo from './templates/echo.ts?raw';

const removeHeader = (str: string) => str.split('\n').slice(4).join('\n');

export const templates = {
  echo: removeHeader(echo),
};
