//
// Copyright 2025 DXOS.org
//
import { renderTokenSet, type TokenSet } from '@ch-ui/tokens';

import { log } from '@dxos/log';
import { userDefaultTokenSet } from '@dxos/react-ui-theme';

const storageKey = 'dxos.org/dx-theme-editor/user-tokens';

export const save = (value: string) => {
  let nextValue = null;
  try {
    nextValue = JSON.stringify(JSON.parse(value));
  } catch (err) {
    log.warn('Invalid JSON', err);
    return err;
  }
  if (nextValue) {
    localStorage.setItem(storageKey, nextValue);
    log.debug('Saved');
    return null;
  }
};

export const restore = () => {
  const storedTokenSet = localStorage.getItem(storageKey);
  return (storedTokenSet ? JSON.parse(storedTokenSet) : userDefaultTokenSet) as TokenSet;
};

const styleNodeId = `${storageKey}/style`;

export const saveAndRender = (value?: string) => {
  let tokens = '';
  try {
    const nextTokens = value ? JSON.parse(value) : restore();
    localStorage.setItem(storageKey, JSON.stringify(nextTokens));
    tokens = `@layer user-tokens { ${renderTokenSet(nextTokens)} }`;
  } catch (err) {
    return log.warn('Failed to render', err);
  }
  if (tokens) {
    const styleNode = document.getElementById(styleNodeId);
    if (styleNode) {
      styleNode.textContent = tokens;
    } else {
      const newStyleNode = document.createElement('style');
      newStyleNode.id = styleNodeId;
      newStyleNode.textContent = tokens;
      document.head.appendChild(newStyleNode);
    }
  }
};

export const reset = () => {
  save(JSON.stringify(userDefaultTokenSet));
};
