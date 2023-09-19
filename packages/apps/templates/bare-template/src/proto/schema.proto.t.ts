import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { name, proto } }) =>
    proto &&
    plate`
    syntax = "proto3";

    package ${name};

    // write your types as messages here
    // then execute 'npm run gen-schema'
    // and import { Task } from './proto';

    // message Task {
    //   option (object) = true;
    //   string title = 1;
    //   bool completed = 2;
    // }
    `,
});
