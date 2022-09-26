<script lang='ts'>
  import { createElement } from 'react';
  import { render } from 'react-dom';
  import { defineComponent } from 'vue';

  export default defineComponent({
    props: ['target', 'component'],
    created() {
      render(
        createElement(this.component, {}, null),
        document.getElementById(this.target)
      );
    }
  });
</script>
