import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { nextTick } from 'vue'
import Layout from './Layout.vue'
import { enableMermaidZoom } from './mermaidZoom'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

    const run = () => {
      void nextTick(() => enableMermaidZoom())
    }

    const previous = router.onAfterRouteChange
    router.onAfterRouteChange = async (to) => {
      await previous?.(to)
      run()
    }

    run()
  },
} satisfies Theme
