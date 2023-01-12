import { defineTemplate, text } from '@dxos/plate';
import config from './config.t';

// this suppresses certain npm warnings during pnpm i of the template
// because we are using react 18 with stuff that peer depends on 14-16
export default defineTemplate(
  () => {
    return text`strict-peer-dependencies=false`;
  },
  { config }
);