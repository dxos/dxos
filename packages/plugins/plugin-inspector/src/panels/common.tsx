//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

export type PanelProps = {
  pluginId: string;
  /** Shown when the plugin contributes nothing to the panel. */
  empty: ReactNode;
};

export const Empty = ({ children }: PropsWithChildren) => <p className='text-sm text-description p-2'>{children}</p>;

export const Section = ({ title, children }: PropsWithChildren<{ title: ReactNode }>) => (
  <section className='flex flex-col gap-1 mb-4'>
    <h3 className='text-sm font-medium'>{title}</h3>
    {children}
  </section>
);

/** The part of a qualified id after its last `.`, e.g. an activation event's name. */
export const shortName = (id: string): string => id.slice(id.lastIndexOf('.') + 1);

const MODULE_SEPARATOR = '.module.';

/** A module's name: its id after `<plugin>.module.`. */
export const moduleName = (id: string): string => {
  const index = id.indexOf(MODULE_SEPARATOR);
  return index === -1 ? id : id.slice(index + MODULE_SEPARATOR.length);
};
