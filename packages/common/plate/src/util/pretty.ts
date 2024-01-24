//
// Copyright 2023 DXOS.org
//

import prettier from 'prettier';

export const pretty = (content: string, path: string) => {
  const map = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'typescript',
    '.jsx': 'typescript',
    '.md': 'markdown',
    '.json': 'json',
    '.html': 'html',
    '.htm': 'html',
    '.yml': 'yaml',
    '.yaml': 'yaml',
  };
  for (const ext in map) {
    if (path.endsWith(ext)) {
      try {
        return prettier.format(content, {
          parser: (map as any)[ext],
        });
      } catch (err) {
        console.error(`Plate template error formatting '${path}'`);
        console.error(err);
        return content;
      }
    }
  }
  return content;
};
