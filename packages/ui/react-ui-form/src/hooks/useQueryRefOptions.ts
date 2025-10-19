//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type TypeAnnotation } from '@dxos/echo/internal';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Palette } from '@dxos/react-ui-types';
import { type MaybePromise } from '@dxos/util';

export type RefOption = { dxn: DXN; label?: string };
export type QueryRefOptions = (type: TypeAnnotation) => MaybePromise<RefOption[]>;

export type QueryTag = {
  id: string;
  label: string;
  hue?: Palette;
};

type UseQueryRefOptionsProps = { refTypeInfo: TypeAnnotation | undefined; onQueryRefOptions?: QueryRefOptions };

/**
 * Hook to query reference options based on type information.
 * Used internally within forms to fetch and format reference options for reference fields.
 */
// TODO(wittjosiah): This should be a reactive query so that the options are always up to date.
export const useQueryRefOptions = ({ refTypeInfo, onQueryRefOptions }: UseQueryRefOptionsProps) => {
  const [options, setOptions] = useState<QueryTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({});
  const update = useCallback(() => setState({}), []);

  useEffect(() => {
    if (!refTypeInfo || !onQueryRefOptions) {
      return;
    }

    const fetchOptions = async () => {
      setLoading(true);
      try {
        const fetchedOptions = await onQueryRefOptions(refTypeInfo);
        setOptions(
          fetchedOptions.map((option) => {
            const dxn = option.dxn.toString() as string;
            return { id: dxn, label: option.label ?? dxn, hue: 'neutral' as any };
          }),
        );
      } catch (error) {
        log.error('Failed to fetch ref options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOptions();
  }, [refTypeInfo, onQueryRefOptions, state]);

  return { options, update, loading };
};
