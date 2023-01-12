
import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input }) => {
    return text`
    //
    // Copyright 2023 DXOS.org
    //
    `;
  },
  { config }
);
