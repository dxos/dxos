<template>
  <div class="showcase-preview">
    <form v-if="fork" action="https://codesandbox.io/api/v1/sandboxes/define" method="POST" target="_blank">
      <input type="hidden" name="parameters" :value="parameters" />
      <input type="submit" class="showcase-fork" value="Fork" />
    </form>
    <div ref="preview"></div>
  </div>
</template>

<style>
.showcase-preview {
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 1em;
  position: relative;
  min-height: 2em;
}

.showcase-fork {
  position: absolute;
  right: 1em;
  cursor: pointer;
}
</style>

<script setup lang='ts'>
  import { getParameters } from 'codesandbox-import-utils/lib/api/define';
  import { createElement } from 'react';
  import { createRoot } from 'react-dom/client';
  import { onMounted, ref } from 'vue';

  import { fromHost } from '@dxos/client';
  import { ClientProvider } from '@dxos/react-client';

  const props = defineProps(['demo', 'fork']);
  const preview = ref<HTMLDivElement | null>(null);

  // Note rollup dynamic import limitations.
  //   https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
  const module = await import(`../demos/${props.demo}.tsx`);
  const parameters = getParameters({
    files: {
      'patches/vite+4.0.4.patch': {
        content: (await import('../templates/codesandbox/patches/vite+4.0.4.patch?raw')).default,
        isBinary: false
      },
      'src/App.tsx': {
        content: (await import(`../demos/${props.demo}.tsx?raw`)).default,
        isBinary: false
      },
      'src/main.tsx': {
        content: (await import('../templates/codesandbox/src/main.tsx?raw')).default,
        isBinary: false
      },
      'index.html': {
        content: (await import('../templates/codesandbox/index.html?raw')).default,
        isBinary: false
      },
      'package.json': {
        content: (await import('../templates/codesandbox/package.json?raw')).default,
        isBinary: false
      },
      'tsconfig.json': {
        content: (await import('../templates/codesandbox/tsconfig.json?raw')).default,
        isBinary: false
      },
      'tsconfig.node.json': {
        content: (await import('../templates/codesandbox/tsconfig.node.json?raw')).default,
        isBinary: false
      },
      'vite.config.ts': {
        content: (await import('../templates/codesandbox/vite.config.ts?raw')).default,
        isBinary: false
      }
    }
  });

  onMounted(() => {
    createRoot(preview.value)
      .render(
        createElement(
          ClientProvider,
          { services: (config) => fromHost(config) }, 
          createElement(module.default, {}, null)
        )
      );
  });
</script>
