//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/** What every module view gets: the module, and the space and sample object the workbench shares. */
export type ViewProps = {
  moduleId: string;
  /** Key of the inspected plugin. */
  pluginKey: string;
  /** Ids of every module of the inspected plugin. */
  pluginModuleIds: readonly string[];
  space?: Space;
  sample?: Obj.Unknown;
  onSample: (sample: Obj.Unknown) => void;
};

export const Note = ({ children }: PropsWithChildren) => <p className='text-sm text-description'>{children}</p>;

export const Section = ({ title, children }: PropsWithChildren<{ title: ReactNode }>) => (
  <section className='flex flex-col gap-2'>
    <h3 className='text-xs uppercase tracking-wide text-description'>{title}</h3>
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
