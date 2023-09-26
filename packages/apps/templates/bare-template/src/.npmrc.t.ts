import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: plate`
  strict-peer-dependencies=false
  enable-pre-post-scripts=true
  `
})