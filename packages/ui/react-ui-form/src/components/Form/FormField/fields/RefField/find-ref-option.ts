//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui/dx-tag-picker.pcss';
import { Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { type RefOption } from '#types';

// Kept out of `RefField.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

const isRefSnapshot = (val: any): val is { '/': string } => {
  return typeof val === 'object' && typeof (val as any)?.['/'] === 'string';
};

/**
 * Find the option a ref-like form value points at. Matches on the local (entity-id) form so a bare local EID
 * (`echo:/<id>`, produced by `Ref.make`) still resolves against an option keyed by the entity's qualified
 * self URI (`echo://<space>/<id>`). Returns `undefined` when the value is not a ref or no option matches.
 *
 * Comparing by entity id is only sound within one space (ids are unique there, not globally). Two EIDs that
 * both carry a space authority must therefore agree on it: a qualified value and a qualified option from
 * different spaces never match, even when their entity ids coincide.
 */
export const findRefOption = (value: unknown, options: RefOption[]): RefOption | undefined => {
  const isRef = Ref.isRef(value);
  if (!isRef && !isRefSnapshot(value)) {
    return undefined;
  }
  const valueUri = isRef ? value.uri : value['/'];
  // Keyed/registry entities (skills, operations) are referenced by a named DXN rather than an
  // entity-id, so they carry no parseable EID; match those by direct URI equality against the option id.
  const directMatch = options.find((option) => option.id === valueUri);
  if (directMatch) {
    return directMatch;
  }
  const valueEid = EID.tryParse(valueUri);
  if (!valueEid) {
    return undefined;
  }
  const valueSpaceId = EID.getSpaceId(valueEid);
  const valueLocal = EID.toLocal(valueEid);
  return options.find((option) => {
    const optionEid = EID.tryParse(option.id);
    if (!optionEid) {
      return false;
    }
    const optionSpaceId = EID.getSpaceId(optionEid);
    if (valueSpaceId != null && optionSpaceId != null && valueSpaceId !== optionSpaceId) {
      return false;
    }
    return EID.equals(EID.toLocal(optionEid), valueLocal);
  });
};
