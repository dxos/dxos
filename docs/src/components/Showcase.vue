<template>
  <div class="showcase-preview">
    <div class="demo-controls">
      <div role="separator" />
      <vue-custom-tooltip v-if="controls.includes('fork')" label="Fork to Stackblitz">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256" @click="handleStackblitz">
          <path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path>
        </svg>
      </vue-custom-tooltip>
    </div>
    <iframe :src="iframeSrc"></iframe>
  </div>
</template>

<style scoped>
.showcase-preview {
  margin-top: 2rem;
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

.demo-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 1rem;
}

.demo-controls form {
  display: contents;
}

.demo-controls [role='separator'] {
  flex-grow: 1;
}

.demo-controls path {
  fill: var(--text-color-light);
}

.peers {
  display: flex;
  width: 100%;
  gap: 1rem;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.peers > div {
  flex: 1 0 0;
  width: v-bind('peerWidth');
}
</style>

<script setup lang="ts">
import VueCustomTooltip from '@adamdehaven/vue-custom-tooltip';
import sdk from '@stackblitz/sdk';
import { onMounted, ref } from 'vue';

const examples = import.meta.glob('../stories/react/examples/*.tsx', { as: 'raw', eager: true })
const proto = import.meta.glob('../stories/proto/*.proto', { as: 'raw', eager: true })

const template = Object
  .entries(import.meta.glob('../templates/vite/**/*', { as: 'raw', eager: true }))
  .reduce((acc, [path, content]) => {
    acc[path.replace(/^..\/templates\/vite\//, '')] = content;
    return acc;
  }, {});

console.log({ examples, proto, template });

const props = defineProps({
  example: {
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
  }
});

// From https://stackoverflow.com/a/67243723/2804332
const kebabize = (str) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

const story = kebabize(props.example);
const iframeSrc = `http://localhost:9009/iframe.html?args=&id=dxos-examples--${story}&viewMode=story`;

const handleStackblitz = async () => {
  sdk.openProject({
    title: `DXOS ${props.example}`,
    template: 'node',
    files: {
      ...template,
      'src/Demo.tsx': examples[`../stories/react/examples/${props.example}.tsx`],
      'src/proto/schema.proto': proto[`../stories/proto/${props.example}.proto`],
    }
  });
};

const loading = ref<HTMLDivElement | null>(null);

onMounted(() => {
  setTimeout(() => {
    if (loading.value) {
      loading.value.classList.add('show');
    }
  }, 300);
});
</script>
