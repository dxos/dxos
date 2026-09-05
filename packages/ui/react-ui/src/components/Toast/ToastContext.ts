//
// Copyright 2025 DXOS.org
//

import { type CreateToasterReturn } from '@ark-ui/react/toast';
import { type ForwardedRef, type HTMLAttributes, type ReactNode } from 'react';

import { createContext } from '@dxos/react-hooks';
import { type ClassNameValue } from '@dxos/ui-types';

// Kept out of `Toast.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const TOAST_NAME = 'Toast';

/** What a declared `Toast.Root` hands the viewport to render inside the machine's actor. */
export type ToastEntry = {
  children: ReactNode;
  classNames?: ClassNameValue;
  props: HTMLAttributes<HTMLDivElement>;
  ref: ForwardedRef<HTMLDivElement>;
  /** Milliseconds the toast stays, for the countdown; `Infinity` for one that stays. */
  countdown: number;
};

/**
 * The declared roots, keyed by toast id. An external store rather than React state so a root
 * re-registering on every render re-renders the viewport alone, not the provider's whole subtree.
 */
export class ToastRegistry {
  #entries = new Map<string, ToastEntry>();
  #listeners = new Set<() => void>();
  #version = 0;

  get(id: string): ToastEntry | undefined {
    return this.#entries.get(id);
  }

  set(id: string, entry: ToastEntry): void {
    this.#entries.set(id, entry);
    this.#notify();
  }

  delete(id: string): void {
    if (this.#entries.delete(id)) {
      this.#notify();
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): number => this.#version;

  #notify(): void {
    this.#version += 1;
    this.#listeners.forEach((listener) => listener());
  }
}

export type ToastContextValue = {
  toaster: CreateToasterReturn;
  registry: ToastRegistry;
  duration: number;
};

export const [ToastProvider, useToastContext] = createContext<ToastContextValue>(TOAST_NAME);
