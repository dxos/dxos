//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Frame } from '@dxos/framebox';

// @ts-ignore
import mainUrl from './frame-main?url';
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
        '@frame/bundle': `data:text/javascript;base64,${btoa(code)}`
      }
    })
  );

  return <iframe srcDoc={html} />;
};
