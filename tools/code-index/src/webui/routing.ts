//
// Copyright 2026 DXOS.org
//

import { createSignal } from 'solid-js';

/**
 * The project id lives in the URL (`/p/<id>`), so a session is a link and a reload keeps its
 * place. When the URL names nothing, the last project opened in this browser is used — remembered
 * here rather than asked of the server, because "last opened" is a property of this tab's user.
 */

const LAST_KEY = 'code-index/last-project';

const parse = (path: string): string | undefined => {
  const match = /^\/p\/([^/?#]+)/.exec(path);
  return match?.[1];
};

export const lastProject = (): string | undefined => {
  try {
    return window.localStorage.getItem(LAST_KEY) ?? undefined;
  } catch {
    // A browser with storage disabled simply has no memory of the last project.
    return undefined;
  }
};

const remember = (projectId: string): void => {
  try {
    window.localStorage.setItem(LAST_KEY, projectId);
  } catch {
    // Not remembering is not a failure worth surfacing.
  }
};

const [current, setCurrent] = createSignal<string | undefined>(parse(window.location.pathname));

window.addEventListener('popstate', () => setCurrent(parse(window.location.pathname)));

export const currentProject = current;

/** Navigates to a project, pushing history so Back returns to the previous one. */
export const openProject = (projectId: string, options?: { readonly replace?: boolean }): void => {
  const url = `/p/${projectId}`;
  if (options?.replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  remember(projectId);
  setCurrent(projectId);
};
