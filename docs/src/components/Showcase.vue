<template>
  <div class="showcase-preview">
  <Suspense>
    <!-- TODO(wittjosiah): CodeSandbox not respecting patch-package from api. -->
    <RenderReactDemo
      :demo="demo"
      :fork="false"
    />

    <template #fallback>
      <div class="showcase-loading" ref="loading">
        Loading...
      </div>
    </template>
  </Suspense>
  </div>
</template>

<style>
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

.showcase-loading.show {
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
