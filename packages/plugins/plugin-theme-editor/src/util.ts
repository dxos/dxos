//
// Copyright 2025 DXOS.org
//

import { renderTokenSet } from '@ch-ui/tokens';

import { log } from '@dxos/log';
import { userDefaultTokenSet } from '@dxos/ui-theme';

import { themeEditorId } from './defs';

export const save = (value: string) => {
  let nextValue = null;
  try {
    nextValue = JSON.stringify(JSON.parse(value));
  } catch (err) {
    log.warn('Invalid JSON', err);
    return err;
  }
  if (nextValue) {
    localStorage.setItem(themeEditorId, nextValue);
    log.debug('Saved');
    return null;
  }
};

export const restore = () => {
  return JSON.stringify(
    JSON.parse(localStorage.getItem(themeEditorId) ?? JSON.stringify(userDefaultTokenSet)),
    null,
    2,
  );
};

const styleNodeId = `${themeEditorId}/style`;

export const saveAndRender = (value?: string) => {
  let tokens = '';
  try {
    const nextTokens = JSON.parse(value ?? restore());
    localStorage.setItem(themeEditorId, JSON.stringify(nextTokens));
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
