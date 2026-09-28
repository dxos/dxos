//
// Copyright 2026 DXOS.org
//

import type * as Automerge from '@automerge/automerge';

/** Automerge's module, as a realm that loaded it registers it. */
export type AutomergeModule = typeof Automerge;

let registered: AutomergeModule | undefined;

/**
 * Makes `automerge` answer for every document that is not a tab document. A realm that holds
 * Automerge documents registers it once it has initialized its WebAssembly; a tab that registers
 * nothing holds only tab documents.
 */
export const register = (automerge: AutomergeModule): void => {
  registered = automerge;
};

/** The registered Automerge, if any: a realm without it makes tab documents where Automerge would make its own. */
export const getRegistered = (): AutomergeModule | undefined => registered;

/**
 * Runs `fn` as a realm that registered no Automerge, as a proxy-mode tab in a browser is, so a test in
 * Node reaches what the namespace does there. `fn` must be synchronous: the registration returns with it.
 */
export const withoutAutomerge = <T>(fn: () => T): T => {
  const previous = registered;
  registered = undefined;
  try {
    return fn();
  } finally {
    registered = previous;
  }
};

/** A call reached Automerge in a realm that registered none, which only a tab document could have answered. */
export class AutomergeNotRegisteredError extends Error {
  constructor(name: string) {
    super(`Automerge.${name} needs Automerge, which this realm has not registered`);
  }
}

/** A tab document reached a function only Automerge implements. */
export class TabDocumentUnsupportedError extends Error {
  constructor(name: string) {
    super(`Automerge.${name} does not take a tab document`);
  }
}

/** The registered Automerge, for a call that needs it. */
export const requireRegistered = (name: string): AutomergeModule => {
  if (!registered) {
    throw new AutomergeNotRegisteredError(name);
  }
  return registered;
};
