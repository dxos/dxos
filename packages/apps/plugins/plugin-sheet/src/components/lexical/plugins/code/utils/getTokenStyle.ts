//
// Copyright 2024 DXOS.org
//

import { type TokenType } from '../types';

export default (tokenTypes: TokenType[]): string | null => {
  if (tokenTypes.length === 0) {
    return null;
  }

  const type = tokenTypes[0];
  if (!type) {
    return null;
  }

  switch (type) {
    case 'boolean':
      return 'color: #029cfd';
    case 'error':
      return 'color: red';
    case 'function':
      return 'color: darkseagreen';
    case 'reference':
      return 'color: mediumpurple';
  }
};
