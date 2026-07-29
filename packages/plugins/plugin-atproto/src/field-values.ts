//
// Copyright 2026 DXOS.org
//

import { Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { getFieldPublishFlags } from './annotation';

/** Format a resolved (non-ref) field value as the compact string the network view shows. */
export const formatValue = (value: unknown): string => {
  if (value == null) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
};

/**
 * The display value of a field as the network sees it — the lens output, not the raw ECHO value. A
 * `Ref<Text>` (e.g. a review) is resolved to its content, not shown as `Ref(…)`.
 */
export const resolveDisplayValue = async (value: unknown): Promise<string> => {
  if (!Ref.isRef(value)) {
    return formatValue(value);
  }
  try {
    const target = await value.load();
    return Obj.instanceOf(Text.Text, target) ? target.content || '—' : (Obj.getLabel(target) ?? '—');
  } catch {
    return '—';
  }
};

/**
 * Snapshot the display value of every Published leaf field, keyed by JSONPath. Captured at publish
 * time and stored on the publication so the companion can flag which Published fields have since
 * diverged — a diverged Published field is exactly what puts the object out of sync.
 */
export const computePublishedValues = async (object: Obj.Unknown): Promise<Record<string, string>> => {
  const type = Obj.getType(object);
  if (!type) {
    return {};
  }
  const values: Record<string, string> = {};
  for (const field of getFieldPublishFlags(Type.getSchema(type))) {
    if (!field.group && field.visibility === 'publish') {
      values[field.path] = await resolveDisplayValue(Obj.getValue(object, field.path.split('.')));
    }
  }
  return values;
};
