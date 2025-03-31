<template>
  <div class="showcase-preview">
    <div class="demo-controls">
      <div role="separator"></div>
      <button v-if="controls.includes('fork')" @click="handleStackblitz">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256">
          <path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path>
        </svg>
        Try on Stackblitz
      </button>
    </div>
    <ClientOnly>
      <iframe :src="iframeSrc"></iframe>
    </ClientOnly>
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

.demo-controls [role='separator'] {
  flex-grow: 1;
}

.demo-controls path {
  fill: var(--text-color-light);
}

.demo-controls button {
  background-color: var(--bg-color-secondary);
  color: var(--text-color-light);
  display: flex;
  align-items: center;
  padding: 0.5rem 1.5rem;
  border: 0;
  border-radius: 2rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}

.demo-controls button svg {
  margin-inline-end: 5px;
}

iframe {
  display: flex;
  width: 100%;
  height: v-bind(iframeHeight);
  gap: 1rem;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
</style>

<script setup lang="ts">
import sdk from '@stackblitz/sdk';
import { onMounted, ref } from 'vue';

const examples = import.meta.glob('../../node_modules/@dxos/examples/src/examples/*.tsx', { as: 'raw', eager: true })
const proto = import.meta.glob('../../node_modules/@dxos/examples/src/proto/*.proto', { as: 'raw', eager: true })

const template = Object
  .entries(import.meta.glob('../../node_modules/@dxos/examples/src/template/**/*', { as: 'raw', eager: true }))
  .reduce((acc, [path, content]) => {
    acc[path.replace(/^..\/..\/node_modules\/@dxos\/examples\/src\/template\//, '')] = content;
    return acc;
  }, {});

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
  },
  iframeHeight: {
    type: String,
    default: '20rem'
  },
  darkMode: {
    type: Boolean
  }
});

// From https://stackoverflow.com/a/67243723/2804332
const kebabize = (str: string) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

const story = kebabize(props.example);
// TODO(wittjosiah): Make reactive inside story embed.
const theme = props.darkMode ? '&globals=theme:dark' : '';
const baseUrl = import.meta.env.VITE_EXAMPLE_BASE_URL ?? 'https://main--647a35ed4eb504c8af6680fc.chromatic.com'
const iframeSrc = `${baseUrl}/iframe.html?args=&id=dxos-examples--${story}&viewMode=story${theme}`;

const handleStackblitz = async () => {
  sdk.openProject({
    title: `DXOS ${props.example}`,
    template: 'node',
    files: {
      ...template,
      'src/components/Demo.tsx': examples[`../../node_modules/@dxos/examples/src/examples/${props.example}.tsx`],
      'src/proto/schema.proto': proto[`../../node_modules/@dxos/examples/src/proto/schema.proto`],
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
