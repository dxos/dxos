//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react } }) => plate`
    import '@dxos/shell/style.css';

    import { Config, Defaults, Local } from '@dxos/config';
    import { runShell } from '@dxos/shell';

    void runShell(new Config(Local(), Defaults()));`,
});
