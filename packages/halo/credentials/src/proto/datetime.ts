//
// Copyright 2020 DXOS.org
//

import moment from 'moment';

/**
 * Creates a properly formatted RFC-3339 date-time string for "now".
 * @returns {string}
 */
// TODO(burdon): Move?
export const createDateTimeString = () => moment().format('YYYY-MM-DDTHH:mm:ssZ');
