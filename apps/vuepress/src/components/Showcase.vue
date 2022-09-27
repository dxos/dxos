<template>
  <!-- TODO(wittjosiah): Move suspense to app-level? -->
  <Suspense>
    <section>
      <ClientOnly>
        <RenderReactDemo
          :demo="demo.name"
          :target="demo.name"
        />
      </ClientOnly>
      <div :id="demo.name"></div>
      <CodeGroup>
        <CodeGroupItem title="TS">
          <!-- Based on https://github.com/vuepress/vuepress-next/blob/d283ffe/packages/markdown/src/plugins/codePlugin/codePlugin.ts -->
          <!-- TODO(wittjosiah): Remove extra padding. -->
          <div className="language-typescript ext-ts">
            <pre className="language-typescript">
              <code v-html="demo.tsSource"></code>
            </pre>
          </div>
        </CodeGroupItem>
        <CodeGroupItem title="JS">
          <div className="language-javascript ext-js">
            <pre className="language-javascript">
              <code v-html="demo.jsSource"></code>
            </pre>
          </div>
        </CodeGroupItem>
      </CodeGroup>
    </section>
  </Suspense>
</template>

<script lang='ts'>
  import { defineComponent } from 'vue';

  import RenderReactDemo from './RenderReactDemo.vue';

  interface Demo {
    name: string
    tsSource: string
    jsSource: string
  }

  export default defineComponent({
    components: { RenderReactDemo },
    props: {
      demoJson: {
        type: String,
        required: true
      }
    },
    computed: {
      demo(): Demo {
        return JSON.parse(decodeURIComponent(this.demoJson)) as Demo;
      }
    }
});
</script>
