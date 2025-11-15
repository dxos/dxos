//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/**
 * @deprecated Use {@link SurfaceComponentProps} instead.
 */
// TODO(burdon): Remove?
export type PreviewProps<T extends Obj.Any = Obj.Any> = PropsWithChildren<
  SurfaceComponentProps<
    T,
    {
      // TODO(burdon): Why is this required (why active?)
      activeSpace?: Space;
      // TODO(burdon): Remove in favor of intents?
      onSelect?: (obj: Obj.Any) => void;
    }
  >
>;
