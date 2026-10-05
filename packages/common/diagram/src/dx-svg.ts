//
// Copyright 2026 DXOS.org
//

//
// The `.dx.svg` container: an SVG that renders anywhere and carries the data it was drawn from, as
// draw.io's editable SVG does. The payload (for the illustrator, a `.dx.json` with the drawing's ECHO
// objects) is JSON text in a `<metadata id="dx-payload">` element: unlike an attribute or a comment,
// `<metadata>` survives browsers, GitHub and DOMPurify. Format-only and ECHO-agnostic; the illustrator
// builds and reads the payload.
//

/** The container format; versions the slot and encoding, not the payload, which versions itself. */
export const FORMAT = 'org.dxos.dx-svg@1';

const NAMESPACE = 'https://dxos.org/ns/dx-svg';

const MEDIA_TYPE = 'application/vnd.dxos.dx+json';

const NOTICE =
  '<!-- Drawn in DXOS: the embedded data is the source; edits to the picture alone are not reflected in it. -->';

/**
 * JSON with `<`, `>` and `&` as unicode escapes, so the text needs neither CDATA nor entity decoding
 * and `JSON.parse` restores it exactly. A top-level `objects` array goes one object per line, so a
 * changed drawing diffs by object.
 */
const encode = (payload: unknown): string => {
  const escape = (json: string) => json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'objects' in payload &&
    Array.isArray(payload.objects)
  ) {
    const { objects, ...rest } = payload;
    const head = JSON.stringify(rest);
    const body = objects.map((object: unknown) => escape(JSON.stringify(object))).join(',\n');
    return `${escape(head.slice(0, -1))}${head.length > 2 ? ',' : ''}"objects":[\n${body}\n]}`;
  }
  return escape(JSON.stringify(payload));
};

/** Embeds a payload in a standalone SVG: a marker on the root and the payload as its first child. */
export const embed = (svg: string, payload: unknown): string => {
  const root = /<svg\b[^>]*>/.exec(svg);
  if (!root) {
    throw new Error('Not an SVG document: no <svg> element.');
  }
  if (/\bdx:payload=/.test(root[0])) {
    throw new Error('The SVG already carries a dx-svg payload.');
  }
  const open = root[0].replace(/<svg\b/, `<svg xmlns:dx="${NAMESPACE}" dx:payload="${FORMAT}"`);
  const metadata = `<metadata id="dx-payload" data-type="${MEDIA_TYPE}" data-version="1" data-encoding="json">\n${encode(payload)}\n</metadata>`;
  return `${svg.slice(0, root.index)}${NOTICE}\n${open}${metadata}${svg.slice(root.index + root[0].length)}`;
};

/** Whether an SVG carries a payload, without parsing it. */
export const isDxSvg = (svg: string): boolean => /<metadata\b[^>]*\bid="dx-payload"/.test(svg);

/**
 * The payload of a `.dx.svg`, or undefined for a plain SVG. Works on the text alone, so it runs in node,
 * workers and the browser. An encoding this version does not know is an error, not a missing payload.
 */
export const extract = (svg: string): unknown => {
  const match = /<metadata\b([^>]*)\bid="dx-payload"([^>]*)>([\s\S]*?)<\/metadata>/.exec(svg);
  if (!match) {
    return undefined;
  }
  const attributes = `${match[1]} ${match[2]}`;
  const encoding = /\bdata-encoding="([^"]*)"/.exec(attributes)?.[1] ?? 'json';
  if (encoding !== 'json') {
    throw new Error(`Unsupported dx-svg payload encoding: ${encoding}.`);
  }
  return JSON.parse(match[3]);
};
