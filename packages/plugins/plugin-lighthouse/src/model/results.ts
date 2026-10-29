//
// Copyright 2026 DXOS.org
//

// The entity → card mapping follows lighthouse's web UI (`web/src/results.ts`), so a result reads the same in both.

import { type Entity, type Value } from '../client/types.ts';
import { type Location, locationOf } from './location.ts';

/** `location`: the row places the result (district, street); the first such row carries the map popover. */
export type CardRow = { icon: string; text: string; title?: string; location?: boolean };

/** Where the card's result is: its point (through `locationOf`) and its address as one line. */
export type CardGeo = Location & { address: string };

export type CardTag = { label: string; hue?: 'emerald' | 'red' | 'amber' | 'neutral' };

/** What a result card shows: identity, the price or key figure, a few facts as rows, and tags. */
export type CardModel = {
  id: string;
  title: string;
  url?: string;
  site?: string;
  /** The price line, or the key figure when the result has no price (a rating, a salary range). */
  price?: string;
  priceNote?: string;
  /** A short line above the title (an act's journal reference, "Pick #2"). */
  eyebrow?: string;
  description?: string;
  images: string[];
  /** A Phosphor icon for the result's type, shown in place of a picture when it has none. */
  icon: string;
  /** The picture is a logo (an organisation's), shown whole on a light ground rather than cropped. */
  logo?: boolean;
  rows: CardRow[];
  tags: CardTag[];
  /** The result's point, when it has one. */
  geo?: CardGeo;
  /** The card names a place (a district, a street) but has no point to map: "no location". */
  unlocated?: boolean;
};

/** Subjects that are scaffolding rather than results: results pages, and the result nodes of a web search. */
const SCAFFOLD = new Set([
  'schema:SearchResultsPage',
  'lh:SearchResult',
  'prov:Entity',
  'schema:PropertyValue',
  'schema:ListItem',
  'schema:BreadcrumbList',
  'schema:ItemList',
  'schema:WebSite',
  'schema:Offer',
  'schema:AggregateRating',
  'schema:PostalAddress',
  'schema:GeoCoordinates',
  'schema:ImageObject',
]);

/** Properties that only name or place a subject; a result with nothing else is thin. */
const IDENTITY = new Set([
  'schema:name',
  'schema:headline',
  'schema:url',
  'lh:resultUrl',
  'lh:foundBy',
  'schema:mentions',
  'lh:site',
  'schema:identifier',
  'schema:sameAs',
  'lh:sourcePage',
]);

const first = (entity: Entity, ...keys: string[]): Value | undefined => {
  for (const key of keys) {
    const value = entity.props[key]?.[0];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))
      ? Number(value)
      : undefined;

const local = (curie: string) => curie.replace(/^[a-z]+:/, '');

/** Formats a number for a card: grouped, with at most `digits` fraction digits; a dash when absent. */
export const formatNumber = (value: number | undefined, digits = 0): string =>
  value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US', { maximumFractionDigits: digits });

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decodes the HTML entities scraped titles keep (&amp;, &#038;, &#x27; …). */
export const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (match, name: string) => ENTITIES[name] ?? match);

export const titleOf = (entity: Entity): string =>
  decodeEntities(
    String(
      first(entity, 'schema:name', 'schema:headline', 'schema:title', 'lh:title') ?? local(entity.id).slice(0, 80),
    ),
  );

export const isThin = (entity: Entity): boolean =>
  Object.keys(entity.props).filter((key) => !IDENTITY.has(key)).length < 2;

export const urlOf = (entity: Entity): string | undefined => {
  const url = first(entity, 'lh:resultUrl', 'schema:url');
  return typeof url === 'string' && url.startsWith('http') ? url : entity.id.startsWith('http') ? entity.id : undefined;
};

/** The result's kind, from its first non-scaffolding rdf:type ("Restaurant", "Product Listing"). */
export const kindOf = (entity: Entity): string => {
  const type = entity.types.find((type) => !SCAFFOLD.has(type) && type !== 'schema:WebPage') ?? entity.types[0];
  return type ? local(type).replace(/([a-z])([A-Z])/g, '$1 $2') : 'Thing';
};

/** Things worth a card: named subjects that are not search scaffolding, bare web pages or extension nodes. */
export const isResult = (entity: Entity): boolean =>
  !entity.types.some((type) => SCAFFOLD.has(type)) &&
  !(entity.types.length === 1 && entity.types[0] === 'schema:WebPage') &&
  !entity.id.startsWith('urn:lh:extraction') &&
  // Extension nodes and their items (a menu's dishes) belong to their subject's card.
  !entity.id.includes('#ext-') &&
  (entity.props['schema:name'] !== undefined || entity.props['schema:headline'] !== undefined);

/** A price line from the listing, product or job vocabulary, whichever the entity has. */
export const priceOf = (entity: Entity): { price?: string; note?: string } => {
  const monthly = toNumber(first(entity, 'lh:monthlyPrice'));
  if (monthly !== undefined) {
    const fee = toNumber(first(entity, 'lh:adminFee')) ?? 0;
    return {
      price: `${formatNumber(monthly + fee)} zł / mo`,
      note: fee ? `rent ${formatNumber(monthly)} + fees ${formatNumber(fee)}` : undefined,
    };
  }
  const price = toNumber(first(entity, 'lh:price', 'schema:price', 'lh:salePrice', 'lh:totalPrice'));
  const currency = first(entity, 'lh:currency', 'schema:priceCurrency', 'schema:salaryCurrency');
  if (price !== undefined) {
    return { price: `${formatNumber(price, 2)} ${currency ?? ''}`.trim() };
  }
  const low = toNumber(first(entity, 'lh:salaryMin'));
  const high = toNumber(first(entity, 'lh:salaryMax'));
  if (low !== undefined || high !== undefined) {
    return { price: `${formatNumber(low)}–${formatNumber(high)} ${currency ?? ''}`.trim() };
  }
  const rating = toNumber(first(entity, 'lh:ratingValue', 'schema:ratingValue', 'lh:rating'));
  if (rating !== undefined) {
    return { price: `${formatNumber(rating, 1)} ★` };
  }
  return {};
};

export const imagesOf = (entity: Entity): string[] =>
  ['schema:image', 'lh:image', 'lh:images', 'schema:thumbnailUrl', 'schema:logo', 'lh:logo']
    .flatMap((key) => entity.props[key] ?? [])
    .filter((value): value is string => typeof value === 'string' && /^https?:/.test(value))
    // A listing page carries its whole gallery (otodom: ~15–20 photos); a search result only its tile's few.
    .slice(0, 20);

/** Properties a card shows as rows: the first few with readable values, in a sensible order. */
const ROWS: Array<{ keys: string[]; icon: string; format?: (value: Value) => string; location?: boolean }> = [
  { keys: ['lh:areaM2'], icon: 'ph--ruler--regular', format: (value) => `${formatNumber(toNumber(value), 1)} m²` },
  { keys: ['schema:numberOfRooms', 'lh:rooms'], icon: 'ph--door--regular', format: (value) => `${value} rooms` },
  {
    keys: ['lh:district', 'lh:neighbourhood', 'schema:addressLocality', 'lh:city'],
    icon: 'ph--map-pin--regular',
    location: true,
  },
  {
    keys: ['lh:statedStreet', 'schema:streetAddress', 'schema:address'],
    icon: 'ph--signpost--regular',
    location: true,
  },
  { keys: ['lh:amenity'], icon: 'ph--check-circle--regular' },
  {
    keys: ['schema:brand', 'lh:brand', 'schema:hiringOrganization', 'lh:company'],
    icon: 'ph--storefront--regular',
  },
  { keys: ['lh:workMode', 'lh:seniority'], icon: 'ph--briefcase--regular' },
  { keys: ['lh:court'], icon: 'ph--bank--regular' },
  { keys: ['lh:presidingJudge', 'lh:judge'], icon: 'ph--user--regular' },
  { keys: ['lh:amendmentCount'], icon: 'ph--git-commit--regular', format: (value) => `${value} amending acts` },
  { keys: ['lh:currentStage', 'lh:legalStatus'], icon: 'ph--seal-check--regular' },
  { keys: ['schema:legislationPassedBy'], icon: 'ph--buildings--regular' },
  {
    keys: ['schema:startDate', 'schema:datePosted', 'schema:legislationDate', 'schema:dateCreated'],
    icon: 'ph--calendar--regular',
    format: (value) => String(value).slice(0, 10),
  },
  { keys: ['lh:reviewCount', 'schema:reviewCount', 'lh:citationCount'], icon: 'ph--users--regular' },
  { keys: ['schema:keywords'], icon: 'ph--tag-simple--regular' },
  { keys: ['schema:description'], icon: 'ph--text-align-left--regular' },
];

const LISTS = new Set(['lh:amenity', 'schema:keywords']);

const hostOf = (url?: string): string | undefined => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
};

const clip = (text: string, length: number) => (text.length > length ? `${text.slice(0, length)}…` : text);

/** An act's journal reference or a bill's print number, shown above the title. */
const eyebrowOf = (entity: Entity): string | undefined => {
  const reference = first(entity, 'schema:legislationIdentifier');
  if (reference) {
    return String(reference);
  }
  const print = first(entity, 'lh:printNumber');
  if (print && entity.types.includes('lh:LegislativeProcess')) {
    return `Druk nr ${print}`;
  }
  return undefined;
};

/** Type, in-force flag and decision type as tags, coloured by legal force. */
const legalTags = (entity: Entity): CardTag[] => {
  const tags: CardTag[] = [];
  const type = first(entity, 'schema:legislationType', 'lh:decisionType');
  if (type) {
    tags.push({ label: String(type) });
  }
  const force = first(entity, 'schema:legislationLegalForce');
  if (force === 'schema:InForce') {
    tags.push({ label: 'in force', hue: 'emerald' });
  }
  if (force === 'schema:NotInForce') {
    tags.push({ label: 'not in force', hue: 'red' });
  }
  const passed = first(entity, 'lh:passed');
  if (passed !== undefined && entity.types.includes('lh:LegislativeProcess')) {
    tags.push(
      passed === true || passed === 'true'
        ? { label: 'passed', hue: 'emerald' }
        : { label: 'in process', hue: 'amber' },
    );
  }
  return tags;
};

const TYPE_ICONS: Array<[RegExp, string]> = [
  [/VentureFund|Fund\b|InvestmentFund/, 'ph--vault--regular'],
  [/Person/, 'ph--user--regular'],
  [/Role/, 'ph--identification-badge--regular'],
  [/Organization|Corporation|LocalBusiness/, 'ph--buildings--regular'],
  [/Restaurant|Cafe|Food|Bar/, 'ph--fork-knife--regular'],
  [/Product/, 'ph--package--regular'],
  [/Residence|Apartment|House|Accommodation|Listing/, 'ph--house--regular'],
  [/Article|CreativeWork|WebPage|Legislation/, 'ph--article--regular'],
  [/Event/, 'ph--calendar--regular'],
  [/Place/, 'ph--map-pin--regular'],
];

/** A Phosphor icon for an entity's types (a fund's vault, a person's silhouette). */
export const iconOfTypes = (types: readonly string[]): string =>
  TYPE_ICONS.find(([pattern]) => types.some((type) => pattern.test(type)))?.[1] ?? 'ph--circle--regular';

/** A lighthouse entity as a card. */
export const toCard = (entity: Entity): CardModel => {
  const url = urlOf(entity);
  const { price, note } = priceOf(entity);
  const rows = ROWS.flatMap((row): CardRow[] => {
    const key = row.keys.find((candidate) => entity.props[candidate]?.length);
    const values = key ? entity.props[key] : undefined;
    if (!key || !values) {
      return [];
    }
    const text = LISTS.has(key)
      ? values.slice(0, 6).map(String).join(', ')
      : row.format
        ? row.format(values[0])
        : String(values[0]);
    return text && text !== 'undefined'
      ? [{ icon: row.icon, text: clip(text, 160), title: local(key), ...(row.location ? { location: true } : {}) }]
      : [];
  }).slice(0, 5);
  const at = locationOf(entity);

  return {
    id: entity.id,
    title: titleOf(entity),
    url,
    site: hostOf(url),
    price,
    priceNote: note,
    eyebrow: eyebrowOf(entity),
    images: imagesOf(entity),
    icon: iconOfTypes(entity.types),
    ...(/Organization|VentureFund|Corporation/.test(entity.types.join(' ')) ? { logo: true } : {}),
    rows,
    tags: [{ label: kindOf(entity) }, ...legalTags(entity)],
    ...(at
      ? { geo: { ...at, address: addressOf(entity) } }
      : rows.some((row) => row.location)
        ? { unlocated: true }
        : {}),
  };
};

/** The address as one line, most specific first: street, neighbourhood, district, town (no repeats). */
export const addressOf = (entity: Entity): string => {
  const parts = [
    'lh:statedStreet',
    'schema:streetAddress',
    'lh:neighbourhood',
    'lh:district',
    'schema:addressLocality',
    'lh:city',
  ]
    .map((key) => entity.props[key]?.[0])
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '' && !/^https?:/.test(value));
  return [...new Set(parts)].join(', ') || titleOf(entity);
};

/** Every property of an entity as label/value rows, for the detail pane. */
export const factsOf = (entity: Entity): Array<{ key: string; label: string; values: string[] }> =>
  Object.entries(entity.props)
    .filter(([key]) => !key.startsWith('lh:ext'))
    .map(([key, values]) => ({
      key,
      label: local(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase(),
      values: values.map((value) => decodeEntities(String(value))),
    }));
