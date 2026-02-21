//
// Copyright 2024 DXOS.org
//

import Classify from './classify';
import Create from './create';
import Open from './open';
import Summarize from './summarize';

export { CalendarFunctions } from './google/calendar';
export { GmailFunctions } from './google/gmail';

export const InboxFunctions = {
  Classify,
  Create,
  Open,
  Summarize,
};
