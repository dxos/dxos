import { text, defineTemplate } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input }) => {
    const { dxosUi } = input;
    return !dxosUi
      ? null
      : text`
  // This file is generated intentionally empty to enable vscode extensions to run in this project. 
  // Tailwind itself is configured within the vite plugin from @dxos/react-ui`;
  },
  { config }
);
