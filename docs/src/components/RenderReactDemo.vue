<template>
</template>

<script lang='ts'>
  import { createElement } from 'react';
  import { createRoot } from 'react-dom/client';
  import { defineComponent } from 'vue';

  export default defineComponent({
    props: ['target', 'demo'],
    async setup(props) {
      // Note rollup dynamic import limitations.
      //   https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
      const module = await import(`../demos/${props.demo}.tsx`);
      return {
        component: module.default
      };
    },
    created() {
      createRoot(document.getElementById(this.target))
        .render(createElement(this.component, {}, null));
    }
  });
</script>
