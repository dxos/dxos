<template>
  <!-- TODO(wittjosiah): Move suspense to app-level? -->
  <Suspense>
    <ClientOnly>
      <RenderReactDemo
        :demo="demo"
        <!-- TODO(wittjosiah): CodeSandbox not respecting patch-package from api. -->
        :fork="false"
      />
    </ClientOnly>
  </Suspense>
</template>

<script lang='ts'>
  import { defineComponent } from 'vue';

  import RenderReactDemo from './RenderReactDemo.vue';

  export default defineComponent({
    components: { RenderReactDemo },
    props: {
      demo: {
        type: String,
        required: true
      }
    }
  });
</script>
