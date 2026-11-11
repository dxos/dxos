//
// Copyright 2026 DXOS.org
//

import React, { Suspense } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Surface from '@dxos/app-framework/Surface';
import { type Obj } from '@dxos/echo';
import { ErrorBoundary } from '@dxos/react-error-boundary';

import { useContributions } from '../hooks.ts';
import { Empty, type PanelProps, Section, shortName } from './common.tsx';

export type SurfacesPanelProps = PanelProps & { subject?: Obj.Unknown };

/** Each of the plugin's surfaces whose filter accepts the selected object, rendered live. */
export const SurfacesPanel = ({ pluginId, empty, subject }: SurfacesPanelProps) => {
  const definitions = useContributions(pluginId, Capabilities.ReactSurface).flatMap(({ value }) =>
    Array.isArray(value) ? value : [value],
  );

  if (definitions.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  if (!subject) {
    return <Empty>Create or select an object in Types to render the surfaces that accept it.</Empty>;
  }

  const data = { subject, attendableId: subject.id };
  const matches = definitions.flatMap((definition: Surface.Definition) =>
    (Array.isArray(definition.role) ? definition.role : [definition.role])
      .filter((role: string) => definition.kind === 'react' && (definition.filter?.(data, role) ?? true))
      .map((role: string) => ({ definition, role })),
  );

  if (matches.length === 0) {
    return <Empty>No surface of this plugin accepts the selected object.</Empty>;
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
          <Section key={`${definition.id}:${role}`} title={`${shortName(role)}: ${definition.id}`}>
            <div className='h-80 border border-separator rounded-sm overflow-hidden'>
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
