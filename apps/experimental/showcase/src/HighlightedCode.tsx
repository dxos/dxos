import * as React from 'react';
import CodeBlock from '@theme-original/CodeBlock';

export const HighlightedCode = ({ code, language }: { code: string, language: string}) => {
  return (
    <CodeBlock className={`language-${language}`}>
      { code }
    </CodeBlock>
  );
};
