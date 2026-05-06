//
// Copyright 2023 DXOS.org
//

export const APP_KEY = 'composer.dxos.org';

/**
 * IndexedDB database name for the persistent log store.
 * Shared by the main thread and every Composer worker so all logs land in one
 * store and can be exported together.
 */
export const LOG_STORE_DB_NAME = 'composer-logs';
