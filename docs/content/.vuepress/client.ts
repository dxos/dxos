import { defineClientConfig } from '@vuepress/client';
import { onMounted } from 'vue';

export default defineClientConfig({
  setup() {
    onMounted(() => {
      // Override the DXOS logo link in the top left corner of the screen
      // so it takes you to the DXOS homepage instead of the docs one.
      const brandLink = document.querySelector('.vp-brand');
      if (brandLink) {
        brandLink.setAttribute('href', 'https://dxos.org');
        // Replace with a fresh link to clear event listeners:
        const newLink = brandLink.cloneNode(true);
        if (brandLink.parentNode) {
          brandLink.parentNode.replaceChild(newLink, brandLink);
        }
      }
    })
  },
});