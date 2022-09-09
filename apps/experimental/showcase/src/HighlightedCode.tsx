//
// Copyright 2022 DXOS.org
//

import CodeBlock from '@theme-original/CodeBlock';
import * as React from 'react';

export const HighlightedCode = ({ code, language }: { code: string, language: string}) => {
  return (
    <CodeBlock className={`language-${language}`}>
      { code }
    </CodeBlock>
  );
};
