//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { type TypeAnnotation } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryTag } from '@dxos/react-ui-components';
import { type MaybePromise } from '@dxos/util';

export type RefOption = { dxn: DXN; label?: string };
export type QueryRefOptions = (type: TypeAnnotation) => MaybePromise<RefOption[]>;

type UseQueryRefOptionsProps = { refTypeInfo: TypeAnnotation | undefined; onQueryRefOptions?: QueryRefOptions };

/**
 * Hook to query reference options based on type information.
 * Used internally within forms to fetch and format reference options for reference fields.
 */
export const useQueryRefOptions = ({ refTypeInfo, onQueryRefOptions }: UseQueryRefOptionsProps) => {
  const [options, setOptions] = useState<QueryTag[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [refTypeInfo, onQueryRefOptions]);

  return { options, loading };
};
