//
// Copyright 2026 DXOS.org
//

import { parse, type HTMLElement } from 'node-html-parser';

import { type ResultMapping, type FieldExtractor } from '../types/Provider';

export type ResultData = {
  title: string;
  url: string;
  price?: number;
  currency?: string;
  images: string[];
  properties: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getByPath = (root: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : undefined), root);

const extractHtmlField = (item: HTMLElement, extractor: FieldExtractor): string | undefined => {
  const element = extractor.selector ? item.querySelector(extractor.selector) : item;
  if (!element) {
    return undefined;
  }
  const value = extractor.attr ? element.getAttribute(extractor.attr) : element.text.trim();
  return value == null || value === '' ? undefined : value;
};

const toResultData = (raw: Record<string, string | undefined>): ResultData => {
  const { title, url, price, image, ...rest } = raw;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      properties[key] = value;
    }
  }
  if (price !== undefined) {
    properties.price = price;
  }
  return {
    title: title ?? '',
    url: url ?? '',
    price: price !== undefined && !Number.isNaN(Number(price)) ? Number(price) : undefined,
    images: image ? [image] : [],
    properties,
  };
};

export const extractResults = (body: string, mapping: ResultMapping): ResultData[] => {
  if (mapping.responseType === 'json') {
    const parsed: unknown = JSON.parse(body);
    const items = getByPath(parsed, mapping.itemLocator);
    const array = Array.isArray(items) ? items : [];
    return array.map((item: unknown) => {
      const raw: Record<string, string | undefined> = {};
      for (const [key, extractor] of Object.entries(mapping.fields)) {
        const value = extractor.path ? getByPath(item, extractor.path) : undefined;
        raw[key] = value == null ? undefined : String(value);
      }
      return toResultData(raw);
    });
  }

  const root = parse(body);
  const items = root.querySelectorAll(mapping.itemLocator);
  return items.map((item) => {
    const raw: Record<string, string | undefined> = {};
    for (const [key, extractor] of Object.entries(mapping.fields)) {
      raw[key] = extractHtmlField(item, extractor);
    }
    return toResultData(raw);
  });
};
