//
// Copyright 2026 DXOS.org
//

// Deliberately outside the `util` barrel, like `./cors`: the Worker imports this leaf directly, and
// the barrel re-exports modules that pull Automerge's wasm into the Worker bundle.

/** Feed formats first, then generic XML, then anything: the proxy also fetches article HTML and XRPC JSON. */
const ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8';

const FALLBACK_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

const FALLBACK_ACCEPT_LANGUAGE = 'en-US,en;q=0.9';

/**
 * Headers for the `/api/rss` proxy's upstream fetch, given the requesting client's own.
 *
 * Feed hosts' WAFs reject requests that look automated (The Guardian's with a 406), and a bare
 * server-side fetch does: a Worker sends no User-Agent or Accept-Language, and Node sends `node` and `*`.
 * A browser's own pair is forwarded, so the request reads as the direct fetch it replaces; any other
 * client (curl, a test harness) gets browser-like stand-ins, so probing the route shows what the app gets.
 */
export const rssProxyUpstreamHeaders = ({
  userAgent,
  acceptLanguage,
}: {
  userAgent?: string | null;
  acceptLanguage?: string | null;
}): Record<string, string> =>
  userAgent?.startsWith('Mozilla/5.0 ')
    ? { 'Accept': ACCEPT, 'Accept-Language': acceptLanguage || FALLBACK_ACCEPT_LANGUAGE, 'User-Agent': userAgent }
    : { 'Accept': ACCEPT, 'Accept-Language': FALLBACK_ACCEPT_LANGUAGE, 'User-Agent': FALLBACK_USER_AGENT };
