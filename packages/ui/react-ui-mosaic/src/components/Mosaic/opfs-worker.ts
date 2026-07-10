//
// Copyright 2026 DXOS.org
//

// Local re-export so `new URL('./opfs-worker', import.meta.url)` resolves under Storybook's
// bundler; importing `@dxos/client/opfs-worker` directly as a worker URL does not (see the
// stories-assistant testing setup this mirrors).
import '@dxos/client/opfs-worker';
