import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const searchZh = {
  provider: 'local' as const,
  options: {
    translations: {
      button: {
        buttonText: '搜索',
        buttonAriaLabel: '搜索文档',
      },
      modal: {
        noResultsText: '没有找到相关结果',
        resetButtonTitle: '清除查询',
        footer: {
          selectText: '选择',
          navigateText: '切换',
          closeText: '关闭',
        },
      },
    },
  },
}

export default withMermaid(
  defineConfig({
    lang: 'zh-CN',
    title: 'Zhanhong Chen',
    description:
      'M.S., Tianjin University. 3D vision, real-time stereo matching, and geometric reconstruction.',

    base: '/',
    srcDir: '.',
    srcExclude: [
      'README.md',
      'node_modules/**',
      '.github/**',
      '.vitepress/dist/**',
      '.notes/**',
      '**/node_modules/**',
      '**/.vitepress/**',
    ],

    cleanUrls: true,
    lastUpdated: true,
    ignoreDeadLinks: true,

    markdown: {
      math: true,
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },

    vite: {
      optimizeDeps: {
        include: ['mermaid'],
      },
      server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
      },
      plugins: [
        {
          name: 'fix-windows-atfs-urls',
          enforce: 'pre',
          configureServer(server) {
            server.middlewares.use((req, _res, next) => {
              if (req.url?.includes('/@fs/')) {
                req.url = req.url
                  .replace(/\\/g, '/')
                  .replace(/\/@fs\/([A-Za-z])%3A\//i, '/@fs/$1:/')
              }
              next()
            })
          },
          transformIndexHtml(html) {
            return html.replace(
              /src="([^"]*@fs\/[^"]+)"/g,
              (_match, src: string) => {
                const unix = src.replace(/\\/g, '/')
                let decoded = unix
                try {
                  decoded = decodeURI(unix)
                } catch {
                  decoded = unix
                }
                const vp = decoded.replace(/\\/g, '/').indexOf('/node_modules/vitepress/')
                if (vp !== -1) {
                  return `src="${decoded.replace(/\\/g, '/').slice(vp)}"`
                }
                return `src="${encodeURI(decoded.replace(/\\/g, '/'))}"`
              },
            )
          },
        },
      ],
    },

    themeConfig: {
      nav: [
        { text: '首页', link: '/' },
        {
          text: 'Blog',
          items: [
            { text: '生成式基础', link: '/generative-foundations/' },
            { text: '细结构深度', link: '/fine-detail-depth/' },
          ],
        },
      ],

      sidebar: {
        '/generative-foundations/': [
          {
            text: '生成式建模基础链',
            items: [
              { text: '总览', link: '/generative-foundations/' },
              { text: '01. 总览与预备知识', link: '/generative-foundations/01-prerequisites' },
              { text: '02. VAE', link: '/generative-foundations/02-vae' },
              { text: '03. VQ-VAE', link: '/generative-foundations/03-vq-vae' },
              { text: '04. DDPM', link: '/generative-foundations/04-ddpm' },
              {
                text: '05. DDIM、Score 与 ODE/SDE',
                link: '/generative-foundations/05-ddim-score-ode',
              },
              {
                text: '06. Latent Diffusion',
                link: '/generative-foundations/06-latent-diffusion',
              },
              { text: '07. DiT', link: '/generative-foundations/07-dit' },
              { text: '08. Flow Matching', link: '/generative-foundations/08-flow-matching' },
              { text: '09. PixelDiT', link: '/generative-foundations/09-pixeldit' },
              {
                text: '10. Pixel-Perfect Depth',
                link: '/generative-foundations/10-pixel-perfect-depth',
              },
              { text: '11. PXDepth', link: '/generative-foundations/11-pxdepth' },
              {
                text: '12. 统一比较、术语与资源',
                link: '/generative-foundations/12-comparison-glossary-resources',
              },
            ],
          },
        ],
        '/fine-detail-depth/': [
          {
            text: '细结构单目深度',
            items: [
              { text: '总览', link: '/fine-detail-depth/' },
              {
                text: '01. 问题与基础',
                link: '/fine-detail-depth/01-problem-and-foundations',
              },
              { text: '02. InfiniDepth', link: '/fine-detail-depth/02-infinidepth' },
              {
                text: '03. Pixel-Perfect Depth',
                link: '/fine-detail-depth/03-pixel-perfect-depth',
              },
              { text: '04. MDA', link: '/fine-detail-depth/04-mda' },
              { text: '05. PXDepth', link: '/fine-detail-depth/05-pxdepth' },
              { text: '06. MoGe-3', link: '/fine-detail-depth/06-moge3' },
              { text: '07. 2K Retrofit', link: '/fine-detail-depth/07-2k-retrofit' },
              {
                text: '08. 比较、指标与选择',
                link: '/fine-detail-depth/08-comparison-metrics-and-selection',
              },
            ],
          },
        ],
      },

      outline: {
        level: [2, 3],
        label: '本页目录',
      },

      search: searchZh,

      lastUpdated: {
        text: '最后更新',
        formatOptions: {
          dateStyle: 'medium',
          timeStyle: 'short',
        },
      },

      docFooter: {
        prev: '上一章',
        next: '下一章',
      },

      returnToTopLabel: '回到顶部',
      sidebarMenuLabel: '目录',
      darkModeSwitchLabel: '外观',
      lightModeSwitchTitle: '切换到浅色模式',
      darkModeSwitchTitle: '切换到深色模式',
    },

    mermaid: {
      theme: 'default',
      useMaxWidth: false,
      securityLevel: 'loose',
      themeVariables: {
        fontFamily:
          'ui-sans-serif, system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '15px',
      },
      flowchart: {
        htmlLabels: true,
        useMaxWidth: false,
        padding: 14,
        nodeSpacing: 40,
        rankSpacing: 56,
        wrappingWidth: 168,
      },
    },
  }),
)
