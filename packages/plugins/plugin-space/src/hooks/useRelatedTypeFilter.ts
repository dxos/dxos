//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useCallback, useMemo } from 'react';

import { Entity } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { ViewState, useViewState, useViewStateActions } from '@dxos/react-ui-attention';

const DEFAULT_ICON = 'ph--circle-dashed--regular';

/**
 * Typenames withheld from a related-objects view, keyed by the subject's URI so that the companion
 * panel and the record's inline section agree on one filter. Stored as an exclusion rather than a
 * selection so a type that first appears after the choice was made shows up instead of being
 * silently withheld.
 */
export const relatedTypeFilterAspect: ViewState.Aspect<string[]> = ViewState.define<string[]>({
  key: 'space-related-type-filter',
  backend: 'memory',
  schema: Schema.Array(Schema.String).pipe(Schema.mutable),
  defaultValue: () => [],
});

/** A type present in the related set, with the number of related objects carrying it. */
export type RelatedType = {
  typename: string;
  label: string;
  icon: string;
  count: number;
  visible: boolean;
};

export type UseRelatedTypeFilter = {
  /** Every type present in the unfiltered set, sorted by label. */
  types: RelatedType[];
  /** The related objects that survive the filter. */
  items: Entity.Unknown[];
  toggle: (typename: string) => void;
};

/**
 * Narrows a related-object set by type, deriving the options from the set itself so only types
 * actually present are offered.
 */
export const useRelatedTypeFilter = (items: Entity.Unknown[], contextId?: string): UseRelatedTypeFilter => {
  const { t } = useTranslation();
  const hidden = useViewState(relatedTypeFilterAspect, contextId);
  const { update } = useViewStateActions(relatedTypeFilterAspect, contextId);

  const types = useMemo<RelatedType[]>(() => {
    const byTypename = new Map<string, RelatedType>();
    for (const item of items) {
      const typename = Entity.getTypename(item);
      if (!typename) {
        continue;
      }

      const type = byTypename.get(typename);
      if (type) {
        type.count++;
        continue;
      }

      byTypename.set(typename, {
        typename,
        // `typename.label` belongs to the type's own plugin, which may not have been activated yet;
        // the raw typename is the only label available until it is.
        label: t('typename.label', { ns: typename, defaultValue: typename }),
        icon: Entity.getIcon(item)?.icon ?? DEFAULT_ICON,
        count: 1,
        visible: !hidden.includes(typename),
      });
    }

    return Array.from(byTypename.values()).toSorted((a, b) => a.label.localeCompare(b.label));
  }, [items, hidden, t]);

  const filtered = useMemo(
    () =>
      hidden.length === 0
        ? items
        : items.filter((item) => {
            const typename = Entity.getTypename(item);
            return !typename || !hidden.includes(typename);
          }),
    [items, hidden],
  );

  const toggle = useCallback(
    (typename: string) =>
      update((previous) =>
        previous.includes(typename) ? previous.filter((value) => value !== typename) : [...previous, typename],
      ),
    [update],
  );

  return { types, items: filtered, toggle };
};
