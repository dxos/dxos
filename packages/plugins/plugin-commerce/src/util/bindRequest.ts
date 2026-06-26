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

/** Resolve a binding against a params value, applying min/max transforms for ranges. */
const resolveBinding = (params: Record<string, unknown>, binding: FieldBinding): string | undefined => {
  const raw = params[binding.field];
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

const fillTemplate = (template: string, params: Record<string, unknown>): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value == null || isRecord(value) ? '' : encodeURIComponent(String(value));
  });

/** Build an HTTP request descriptor from params values and a provider request mapping. */
export const bindRequest = (params: Record<string, unknown>, request: RequestMapping): HttpRequest => {
  const base = fillTemplate(request.urlTemplate, params);

  const searchParams = new URLSearchParams();
  for (const [param, binding] of Object.entries(request.query ?? {})) {
    const value = resolveBinding(params, binding);
    if (value !== undefined) {
      searchParams.set(param, value);
    }
  }
  const queryString = searchParams.toString();
  // The urlTemplate may already carry a static query string (e.g. the skill bakes in
  // `?advertising-location=at_cars`), so join with `&` in that case rather than a second `?`.
  const separator = base.includes('?') ? '&' : '?';
  const url = queryString.length > 0 ? `${base}${separator}${queryString}` : base;

  let body: string | undefined;
  if (request.body) {
    const bodyObject: Record<string, string> = {};
    for (const [key, binding] of Object.entries(request.body)) {
      const value = resolveBinding(params, binding);
      if (value !== undefined) {
        bodyObject[key] = value;
      }
    }
    body = JSON.stringify(bodyObject);
  }

  return { method: request.method, url, headers: request.headers, body };
};
