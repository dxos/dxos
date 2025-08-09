//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useSyncExternalStore } from 'react';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import { mx } from '@dxos/react-ui-theme';

export const ObjectLink = ({ space, dxn }: { space: Space; dxn: DXN }) => {
  const object = useResolvedRef(space, Ref.fromDXN(dxn));
  const title = Obj.getLabel(object) ?? object?.id ?? dxn.toString();

  return (
    <a
      href={dxn.toString()}
      title={title}
      className={mx(
        'inline-flex items-center max-w-[16rem] px-2 py-0.5 overflow-hidden',
        // TODO(burdon): Use style for tags.
        'border border-separator rounded whitespace-nowrap text-ellipsis text-primary-500 hover:text-primary-500 hover:border-primary-500',
      )}
      target='_blank'
      rel='noopener noreferrer'
    >
      <span className='truncate'>{title}</span>
    </a>
  );
};

// TODO(burdon): Factor out.
const useResolvedRef = <T,>(space: Space, ref: Ref.Ref<T>): T | undefined => {
  const { subscribe, getSnapshot } = useMemo(() => {
    const resolver = space.db.graph.createRefResolver({});
    let currentCallback: (() => void) | undefined = undefined;

    return {
      subscribe: (cb: () => void) => {
        currentCallback = cb;
        return () => {
          if (currentCallback === cb) {
            currentCallback = undefined;
          }
        };
      },
      getSnapshot: () =>
        resolver?.resolveSync(ref.dxn, true, () => {
          currentCallback?.();
        }) as T | undefined,
    };
  }, [space, ref.dxn.toString()]);

  return useSyncExternalStore<T | undefined>(subscribe, getSnapshot);
};
