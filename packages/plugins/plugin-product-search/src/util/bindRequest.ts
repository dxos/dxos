//
// Copyright 2026 DXOS.org
//

import { type FieldBinding, type RequestMapping } from '../types/Provider';

export type HttpRequest = {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string;
};

/** Narrows an unknown value to a plain object record. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Resolve a binding against a criteria value, applying min/max transforms for ranges. */
const resolveBinding = (criteria: Record<string, unknown>, binding: FieldBinding): string | undefined => {
  const raw = criteria[binding.field];
  if (raw == null) {
    return undefined;
  }
  if (binding.transform === 'min' || binding.transform === 'max') {
    if (!isRecord(raw)) {
      return undefined;
    }
    const value = raw[binding.transform];
    return value == null ? undefined : String(value);
  }
  if (isRecord(raw)) {
    return undefined;
  }
  return String(raw);
};

const fillTemplate = (template: string, criteria: Record<string, unknown>): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = criteria[key];
    return value == null || isRecord(value) ? '' : encodeURIComponent(String(value));
  });

/** Build an HTTP request descriptor from criteria values and a provider request mapping. */
export const bindRequest = (criteria: Record<string, unknown>, request: RequestMapping): HttpRequest => {
  const base = fillTemplate(request.urlTemplate, criteria);

  const params = new URLSearchParams();
  for (const [param, binding] of Object.entries(request.query ?? {})) {
    const value = resolveBinding(criteria, binding);
    if (value !== undefined) {
      params.set(param, value);
    }
  }
  const queryString = params.toString();
  // The urlTemplate may already carry a static query string (e.g. the blueprint bakes in
  // `?advertising-location=at_cars`), so join with `&` in that case rather than a second `?`.
  const separator = base.includes('?') ? '&' : '?';
  const url = queryString.length > 0 ? `${base}${separator}${queryString}` : base;

  let body: string | undefined;
  if (request.body) {
    const bodyObject: Record<string, string> = {};
    for (const [key, binding] of Object.entries(request.body)) {
      const value = resolveBinding(criteria, binding);
      if (value !== undefined) {
        bodyObject[key] = value;
      }
    }
    body = JSON.stringify(bodyObject);
  }

  return { method: request.method, url, headers: request.headers, body };
};
