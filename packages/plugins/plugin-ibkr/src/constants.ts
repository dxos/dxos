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
