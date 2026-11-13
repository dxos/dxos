//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as Button from '@dxos/react-ui/Button';

import { useContributions } from '../hooks.ts';
import { useCreateSample } from '../sample.ts';
import { Note, Section, type ViewProps } from './common.tsx';

/** Each type the module can create; Create adds one to the space and makes it the sample. */
export const CreateObjectView = ({ moduleId, space }: ViewProps) => {
  const entries = useContributions([moduleId], SpaceCapabilities.CreateObjectEntry);
  const { create, error } = useCreateSample(space);

  if (entries.length === 0) {
    return <Note>This module contributes no way to create an object.</Note>;
  }

  return (
    <>
      {entries.map((entry) => (
        <Section key={entry.id} title={<span className='font-mono'>{entry.id}</span>}>
          <div>
            <Button.Root label='Create' icon='ph--plus--regular' disabled={!space} onClick={() => create(entry)} />
          </div>
        </Section>
      ))}
      {error && <p className='text-sm text-error-text'>{error}</p>}
    </>
  );
};
