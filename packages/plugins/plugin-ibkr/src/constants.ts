//
// Copyright 2026 DXOS.org
//

/** Matches `AccessToken.source` for Interactive Brokers credentials. */
export const IBKR_SOURCE = 'interactivebrokers.com';

/** Connector id matching the `ConnectorEntry.id` contributed by this plugin. */
export const IBKR_CONNECTOR_ID = 'ibkr';

/** Skill registry key. */
export const IBKR_SKILL_KEY = 'org.dxos.skill.ibkr';

/**
 * Flex Web Service base URL (SendRequest / GetStatement are suffixes).
 * Using ndcdyn directly avoids a 302 redirect from www that the CORS proxy does not follow server-side.
 */
export const FLEX_BASE_URL = 'https://ndcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService';

/** Identifies the feed (per space) that holds the daily PortfolioReport snapshots. */
export const IBKR_FEED_KIND = 'org.dxos.plugin.ibkr';

/** Cron for the daily sync: 06:00 UTC, after IBKR end-of-day processing. */
export const IBKR_SYNC_CRON = '0 6 * * *';

/** SEC EDGAR endpoints and fair-access User-Agent (no API key required). */
export const SEC_COMPANY_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
export const SEC_COMPANY_FACTS_URL = (cik: string): string =>
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
export const SEC_EDGAR_USER_AGENT = 'DXOS Composer (contact@dxos.org)';

/** Foreign-key `Obj.Meta.keys[].source` values for {@link Ibkr.Instrument}. */
export const ISIN_SOURCE = 'isin';
export const CUSIP_SOURCE = 'cusip';
export const IBKR_CONID_SOURCE = 'ibkr.com';
export const TRADINGVIEW_SOURCE = 'tradingview.com';

/** Exchange-qualified ticker foreign-key source, e.g. `ticker/NASDAQ`. */
export const tickerSource = (exchange: string): string => `ticker/${exchange.toUpperCase()}`;
