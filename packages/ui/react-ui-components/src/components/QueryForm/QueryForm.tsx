//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useState } from 'react';

import { Filter, Query, type Tag } from '@dxos/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

import { Picker } from './Picker';
import { extractTag, extractTypename } from './query';

export type QueryFormProps = ThemedClassName<{
  initialQuery?: Query.Any;
  types?: { id: string; label: string }[];
  tags?: Tag.Tag[];
  onChange?: (query: Query.Any) => void;
}>;

// TODO(wittjosiah): Support more complex queries and traversals.
export const QueryForm = ({ classNames, types, tags, initialQuery, onChange }: QueryFormProps) => {
  const { t } = useTranslation(translationKey);

  const initialType = initialQuery ? Option.getOrUndefined(extractTypename(initialQuery.ast)) : undefined;
  const initialTag = initialQuery ? Option.getOrUndefined(extractTag(initialQuery.ast)) : undefined;

  const [type, setType] = useState<string | null>(initialType ?? null);
  const [tag, setTag] = useState<string | null>(initialTag ?? null);

  const handleChange = useCallback(
    ({ type, tag }: { type: string | null; tag: string | null }) => {
      const typeFilter = type ? Filter.type(type) : null;
      const tagFilter = tag ? Filter.tag(tag) : null;
      const filter =
        typeFilter && tagFilter ? Filter.and(typeFilter, tagFilter) : (typeFilter ?? tagFilter ?? Filter.nothing());
      onChange?.(Query.select(filter));
    },
    [onChange],
  );

  const handleTypeChange = useCallback(
    (type: string | null) => {
      setType(type);
      handleChange({ type, tag });
    },
    [handleChange],
  );

  const handleTagChange = useCallback(
    (tag: string | null) => {
      setTag(tag);
      handleChange({ type, tag });
    },
    [handleChange],
  );

  return (
    <div className={mx('grid grid-cols-2 gap-2', classNames)}>
      {types && (
        <Picker placeholder={t('picker type placeholder')} values={types} value={type} onChange={handleTypeChange} />
      )}
      {tags && (
        <Picker placeholder={t('picker tag placeholder')} values={tags} value={tag} onChange={handleTagChange} />
      )}
    </div>
  );
};
