//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'update-ready.label': 'Ready to update',
        'update-ready.description': 'A new version of Composer is available.',
        'update.label': 'Update',
        'update.alt': 'Relaunch the app to update',
        'settings.channel.label': 'Release channel',
        'settings.channel.stable.label': 'Stable',
        'settings.channel.nightly.label': 'Nightly',
        'settings.channel.stable.description': 'Released builds. Switch to Nightly to try changes before they ship.',
        'settings.channel.nightly.description':
          'A build of the latest development work, published daily. Nightly can upgrade your spaces to a format Stable cannot open, and there is currently no supported way back.',
        'settings.channel.confirm.nightly.title': 'Switch to Nightly?',
        'settings.channel.confirm.nightly.message':
          'Composer will download and install the latest nightly build now. Nightly is published daily from unreleased work and may be unstable. It can also upgrade your spaces to a format Stable cannot open — that upgrade syncs to your other devices and to everyone you share those spaces with, and reinstalling Stable does not undo it. There is currently no supported way back.',
        'settings.channel.confirm.nightly.label': 'Switch to Nightly',
        'settings.channel.confirm.stable.title': 'Switch to Stable?',
        'settings.channel.confirm.stable.message':
          'Composer will download and install the latest released build now. It is older than the nightly you are running, so any space nightly has already upgraded may fail to open — reinstalling does not undo an upgrade.',
        'settings.channel.confirm.stable.label': 'Switch to Stable',
        'settings.updates.label': 'Updates',
        'settings.updates.check.label': 'Check for updates',
        'settings.updates.checking.label': 'Checking…',
        'settings.updates.update-now.label': 'Update now',
        'settings.updates.downloading.label': 'Downloading…',
        'settings.updates.relaunch.label': 'Restart to install',
        'settings.updates.idle.message': 'Check now for a newer version of Composer.',
        'settings.updates.checking.message': 'Checking for updates…',
        'settings.updates.up-to-date.message': 'You are running the latest version of Composer. Checked {{checkedAt}}.',
        'settings.updates.available.message': 'Version {{version}} is available.',
        'settings.updates.downloading.message': 'Downloading… {{percent}}%',
        'settings.updates.ready.message': 'Update ready. Restart Composer to apply.',
        'settings.updates.failed.message': 'Update failed: {{error}}',
        'settings.updates.unsupported.message': 'Updates are not available on this platform.',
        'settings.updates.dev.message': 'Updates are not enabled in dev mode.',
      },
    },
  },
] as const satisfies Resource[];
