<template>
  <div class="showcase-preview">
  <Suspense>
    <!-- TODO(wittjosiah): DXOS demos are not SSR-ready. -->
    <ClientOnly>
      <!-- TODO(wittjosiah): CodeSandbox not respecting patch-package from api. -->
      <RenderReactDemo
        :demo="demo"
        :peerCount="peers"
        :airplaneControl="controls.includes('airplane')"
        :forkable="controls.includes('fork')"
        :createIdentity="setup.includes('identity')"
        :createSpace="setup.includes('space')"
      />
    </ClientOnly>

    <template #fallback>
      <div class="showcase-loading" ref="loading">
        Loading...
      </div>
    </template>
  </Suspense>
  </div>
</template>

<style scoped>
.showcase-preview {
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 1em;
  position: relative;
}

.showcase-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;

  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.show {
  opacity: 1;
}
</style>

<script setup lang='ts'>
  import { onMounted, ref } from 'vue';

  import RenderReactDemo from './RenderReactDemo.vue';

  defineProps({
    demo: {
      type: String,
      required: true
    },
    peers: {
      type: Number,
      default: 1
    },
    controls: {
      type: Array,
      default: []
    },
    setup: {
      type: Array,
      default: []
    }
  });

  const loading = ref<HTMLDivElement | null>(null);

  onMounted(() => {
    setTimeout(() => {
      if (loading.value) {
        loading.value.classList.add('show');
      }
    }, 300);
  });
</script>
