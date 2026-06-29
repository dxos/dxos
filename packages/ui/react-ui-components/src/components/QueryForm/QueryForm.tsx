//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useState } from 'react';

import { type QueryAST, type Tag, Filter, Obj, Query } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { type ThemedClassName } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { Picker } from './Picker';
import { extractTag, extractTypename } from './query';

export type QueryFormProps = ThemedClassName<{
  initialQuery?: QueryAST.Query;
  types?: { value: URI.URI; label: string }[];
  tags?: Tag.Tag[];
  onChange?: (query: Query.Any) => void;
}>;

// TODO(wittjosiah): Support more complex queries and traversals.
export const QueryForm = ({ classNames, initialQuery, types, tags, onChange }: QueryFormProps) => {
  const { t } = useTranslation(translationKey);

  const initialType = initialQuery ? Option.getOrUndefined(extractTypename(initialQuery)) : undefined;
  const initialTag = initialQuery ? Option.getOrUndefined(extractTag(initialQuery)) : undefined;

  const [type, setType] = useState<URI.URI | null>(initialType ?? null);
  const [tag, setTag] = useState<string | null>(initialTag ?? null);

  const tagOptions = useMemo(() => tags?.map((tag) => ({ value: Obj.getURI(tag), label: tag.label })), [tags]);

  const handleChange = useCallback(
    ({ type, tag }: { type: URI.URI | null; tag: string | null }) => {
      const typeFilter = type ? Filter.type(type) : null;
      const tagFilter = tag ? Filter.tag(tag) : null;
      const combined =
        typeFilter && tagFilter ? Filter.and(typeFilter, tagFilter) : (typeFilter ?? tagFilter ?? Filter.nothing());
      onChange?.(Query.select(combined));
    },
    [onChange],
  );

  const handleTypeChange = useCallback(
    (value: string | null) => {
      // Select.onValueChange returns bare string; values come from types[].value which are URI.URI.
      const uri = value as URI.URI | null;
      setType(uri);
      handleChange({ type: uri, tag });
    },
    [handleChange, tag],
  );

  const handleTagChange = useCallback(
    (tag: string | null) => {
      setTag(tag);
      handleChange({ type, tag });
    },
    [handleChange, type],
  );

  return (
    <div className={mx('grid grid-cols-2 gap-2', classNames)}>
      {types && (
        <Picker placeholder={t('picker-type.placeholder')} values={types} value={type} onChange={handleTypeChange} />
      )}
      {tags && (
        <Picker placeholder={t('picker-tag.placeholder')} values={tagOptions} value={tag} onChange={handleTagChange} />
      )}
    </div>
  );
};
