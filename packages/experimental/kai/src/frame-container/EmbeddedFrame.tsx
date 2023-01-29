//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Frame } from '@dxos/framebox';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import mainUrl from './frame-main?url';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import frameSrc from './frame.html?raw';

export type EmbeddedFrameProps = {
  frame: Frame;
};

export const EmbeddedFrame = ({ frame }: EmbeddedFrameProps) => {
  const code = frame.compiled?.bundle ?? 'throw new Error("No bundle")';

  const html = frameSrc.replace(
    // eslint-disable-next-line no-template-curly-in-string
    '${importMap}',
    JSON.stringify({
      imports: {
        '@frame/main': mainUrl,
        '@frame/bundle': `data:text/javascript;base64,${btoa(code)}`,
        ...Object.fromEntries(frame.compiled?.imports?.filter(entry => !entry.moduleUrl!.startsWith('http')).map(entry => [
          entry.moduleUrl!,
          createReexportingModule(entry.namedImports!, entry.moduleUrl!)
        ]) ?? [])
      }
    })
  );

  return <iframe srcDoc={html} />;
};

const createReexportingModule = (namedImports: string[], key: string) => {
  const code = `
    const { ${namedImports.join(',')} } = window.__DXOS_FRAMEBOX_MODULES[${JSON.stringify(key)}];
    export { ${namedImports.join(',')} }
    export default window.__DXOS_FRAMEBOX_MODULES[${JSON.stringify(key)}].default;
  `
  return `data:text/javascript;base64,${btoa(code)}`
}