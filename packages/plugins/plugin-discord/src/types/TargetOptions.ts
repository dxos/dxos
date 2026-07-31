//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Per-target sync options exposed to the user via `provider.optionsSchema`
 * and edited from the Integration UI. Stored under
 * `IntegrationTarget.options` (free-form record) and read by `sync.ts` on
 * each pass.
 */
export const DiscordTargetOptions = Schema.Struct({
  /**
   * Number of days of channel history to pull on the **first** sync of a
   * target. Subsequent syncs are always incremental from the cursor
   * (newest message id seen) regardless of this value, so changing it
   * after the first sync has no effect.
   *
   * Unset → uses the plugin default (see `DEFAULT_DAYS` in
   * `constants.ts`). `0` is treated the same as unset. Bound at sync time
   * to a sane range so an absurd value can't trip Discord rate limits
   * indefinitely.
   */
  maxDays: Schema.Number.pipe(
    Schema.annotations({
      title: 'Days of history to sync',
      description:
        'On first sync, fetch messages from this many days ago. Defaults to 7. Ignored after the first sync.',
    }),
    Schema.optional,
  ),
});

export interface DiscordTargetOptions extends Schema.Schema.Type<typeof DiscordTargetOptions> {}
