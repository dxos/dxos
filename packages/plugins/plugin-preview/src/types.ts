//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type SurfaceCardRole, type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/**
 * @deprecated Use {@link SurfaceComponentProps} instead.
 */
// TODO(burdon): Remove?
export type CardPreviewProps<
  Subject extends Obj.Any = Obj.Any,
  Role extends SurfaceCardRole = SurfaceCardRole,
> = PropsWithChildren<
  SurfaceComponentProps<Subject, Role> & {
    // TODO(burdon): Why is this required (why active?)
    activeSpace?: Space;
    // TODO(burdon): Remove in favor of intents?
    onSelect?: (obj: Obj.Any) => void;
  }
>;
