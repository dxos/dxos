//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { IconButton, ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type SchemaTableProps = ThemedClassName<{
  types: any[];
  objects?: Record<string, number | undefined>;
  label: string;
  /** May be async — the row awaits it, so a generator's failure is reported rather than unowned. */
  onClick: (typename: string) => Promise<void> | void;
}>;

/**
 * Row display name: a preset descriptor may carry one, otherwise the key it is created by.
 *
 * The field is `presetLabel` rather than `name` because a class-based type entity already has a
 * `name` — its JS class name — so keying off that suppressed the count on every real type row.
 */
const rowName = (type: any, typename: string | undefined): string =>
  (typeof type.presetLabel === 'string' ? type.presetLabel : undefined) ?? typename ?? '';

export const SchemaTable = ({ classNames, types, objects = {}, label, onClick }: SchemaTableProps) => {
  // A sample space takes seconds to build. Without holding the row that is running, the click
  // dropped the handler's promise: nothing showed the work in flight, a second click raced the
  // first, and a rejection after the panel unmounted surfaced as an unhandled rejection.
  const [pending, setPending] = useState<string>();
  const handleClick = useCallback(
    async (typename: string) => {
      if (pending !== undefined) {
        return;
      }
      setPending(typename);
      try {
        await onClick(typename);
      } catch (err) {
        log.catch(err);
      } finally {
        setPending(undefined);
      }
    },
    [onClick, pending],
  );

  return (
    <div className={mx('grid grid-cols-[1fr_80px_40px] gap-1 overflow-none', classNames)}>
      <h2 className='p-2'>{label}</h2>
      {types.map((type) => {
        // Preset descriptors are plain `{ typename }` objects, while class-based type entities carry
        // no `typename` property — those resolve via `Type.getTypename`.
        const typename = typeof type.typename === 'string' ? type.typename : Type.getTypename(type);
        return (
          <div key={typename} className='grid grid-cols-subgrid col-span-3 items-center'>
            <div className='px-2 text-sm font-mono text-subdued'>{rowName(type, typename)}</div>
            {/* A labelled row is a preset rather than a type, so it has no object count to show. */}
            <div className='px-2 text-right font-mono'>
              {typeof type.presetLabel === 'string' ? '—' : typename ? (objects[typename] ?? 0) : 0}
            </div>
            <IconButton
              variant='ghost'
              icon={pending === typename ? 'ph--spinner--regular' : 'ph--plus--regular'}
              iconOnly
              disabled={pending !== undefined}
              label={`Create ${rowName(type, typename)}`}
              onClick={() => typename && void handleClick(typename)}
            />
          </div>
        );
      })}
    </div>
  );
};
