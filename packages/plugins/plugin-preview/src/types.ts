//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type SurfaceCardRole, type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Database, type Obj } from '@dxos/echo';

/**
 * @deprecated Use {@link SurfaceComponentProps} instead.
 */
// TODO(burdon): Remove?
export type CardPreviewProps<
  Subject extends Obj.Any = Obj.Any,
  Role extends SurfaceCardRole = SurfaceCardRole,
> = PropsWithChildren<
  SurfaceComponentProps<Subject, Role> & {
    db?: Database.Database;
    // TODO(burdon): Remove in favor of intents?
    onSelect?: (obj: Obj.Any) => void;
  }
>;
