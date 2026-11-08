//
// Copyright 2026 DXOS.org
//

import { type Dialect, EffectDialect } from '@dxos/agent-code-mode';
import { trim } from '@dxos/util';

/**
 * The Effect dialect as this sandbox runs it: the same name, instructions and API, but the program is
 * handed over unwrapped, because the session wraps it itself to bind its top-level declarations.
 * Its bindings are built inside the VM, so none are built here.
 */
export const DjsEffectDialect: Dialect = {
  ...EffectDialect,
  instructions: (context) =>
    `${EffectDialect.instructions(context)}\n\n${trim`
      ### Variables persist

      Every top-level \`const\`, \`let\`, \`function\` and \`class\` an \`eval\` call declares stays
      bound for the rest of this conversation, so a later call can use it without querying again.
      An object held this way stays live and is brought up to date before each call.
    `}`,
  wrap: (code) => code,
  bindings: () => ({}),
};
