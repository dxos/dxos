//
// Copyright 2025 DXOS.org
//

import { useCallback, useState } from 'react';

import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';
import { type Palette } from '@dxos/react-ui-types';
import { type MaybePromise } from '@dxos/util';

export type RefOption = {
  dxn: DXN;
  label?: string;
};

export type QueryRefOptions = ({ typename }: { typename: string }) => MaybePromise<RefOption[]>;

export type QueryTag = {
  id: string;
  label: string;
  hue?: Palette;
};

type UseQueryRefOptionsProps = {
  typename?: string;
  onQueryRefOptions?: QueryRefOptions;
};

/**
 * Hook to query reference options based on type information.
 * Used internally within forms to fetch and format reference options for reference fields.
 */
export const useQueryRefOptions = ({ typename, onQueryRefOptions }: UseQueryRefOptionsProps) => {
  const [options, setOptions] = useState<QueryTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({});
  const update = useCallback(() => setState({}), []);

  useAsyncEffect(async () => {
    if (!typename || !onQueryRefOptions) {
      return;
    }

    setLoading(true);
    try {
      // TODO(wittjosiah): This should be a reactive query so that the options are always up to date.
      const options = await onQueryRefOptions({ typename });
      log('options', { options: options.length });
      setOptions(
        options.map((option) => {
          const dxn = option.dxn.toString() as string;
          return {
            id: dxn,
            label: option.label ?? dxn,
            hue: 'neutral' as any,
          };
        }),
      );
    } catch (error) {
      log.error('Failed to fetch ref options:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [typename, onQueryRefOptions, state]);

  return { options, update, loading };
};
