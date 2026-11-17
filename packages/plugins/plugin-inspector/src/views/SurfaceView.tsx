//
// Copyright 2026 DXOS.org
//

import React, { Suspense } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Surface from '@dxos/app-framework/Surface';
import { ErrorBoundary } from '@dxos/react-error-boundary';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps, shortName } from './common.tsx';

/** Each of the module's surfaces whose filter accepts the sample, rendered with it. */
export const SurfaceView = ({ moduleId, sample }: ViewProps) => {
  const definitions = useContributions([moduleId], Capabilities.ReactSurface).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  );

  if (definitions.length === 0) {
    return <Note>This module contributes no surfaces.</Note>;
  }

  if (!sample) {
    return <Note>Create a sample object to render this module's surfaces with it.</Note>;
  }

  const data = { subject: sample, attendableId: sample.id };
  const matches = definitions.flatMap((definition: Surface.Definition) =>
    (Array.isArray(definition.role) ? definition.role : [definition.role])
      .filter((role: string) => definition.kind === 'react' && (definition.filter?.(data, role) ?? true))
      .map((role: string) => ({ definition, role })),
  );

  if (matches.length === 0) {
    return <Note>No surface of this module accepts the sample.</Note>;
  }

  return (
    <>
      {matches.map(({ definition, role }) => {
        if (definition.kind !== 'react') {
          return null;
        }
        const Component = definition.component;
        const props = { id: definition.id, role, data };
        return (
          <Section key={`${definition.id}:${role}`} title={`${shortName(role)} · ${definition.id}`}>
            <div className='h-80 border border-separator rounded-md overflow-hidden'>
              <ErrorBoundary name={definition.id}>
                <Suspense>
                  <Component {...(definition.props?.(props) ?? props)} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Section>
        );
      })}
    </>
  );
};
