import { defineTemplate, text } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: () => {
    return text`
    //
    // Copyright 2023 DXOS.org
    //
    `;
  }
});
