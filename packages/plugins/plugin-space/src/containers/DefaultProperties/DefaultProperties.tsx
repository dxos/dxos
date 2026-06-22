//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';

export type DefaultPropertiesProps = AppSurface.ObjectPropertiesProps<Obj.Unknown>;

/**
 * Generic object-properties companion rendered for any object: a schema-driven {@link ObjectProperties}
 * form plus the `object-properties` surface, so plugins whose properties are plain editable fields need
 * not register a bespoke surface (mirrors `DefaultSettings` for plugin settings).
 */
export const DefaultProperties = forwardRef<HTMLDivElement, DefaultPropertiesProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo<AppSurface.ObjectPropertiesData>(() => ({ subject: object }), [object]);

    return (
      <Panel.Root role={role} className='dx-document' ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ObjectProperties object={object}>
            {/* TODO(burdon): Ambiguous naming since providers only replace parts. */}
            <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
          </ObjectProperties>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
