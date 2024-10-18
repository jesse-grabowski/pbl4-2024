import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'unplugin-vue-router/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'

// https://vite.dev/config/
export default defineConfig({
  base: '/ritspbl2024f/teamc/',
  server: {
    port: 5500,
  },
  plugins: [
    VueRouter({
      routesFolder: [
        {
          src: 'src/views',
          path: file => {
            // Convert file path to route path
            const srcPath = 'src/views'
            const path = file.slice(file.lastIndexOf(srcPath) + srcPath.length, -8).toLocaleLowerCase()
            return path
          },
        },
      ],
      dts: 'src/router.d.ts',
      // remove '/' prefix for route name
      getRouteName: routeNode => routeNode.fullPath.slice(1),
      extendRoute: route => {
        // Add alias for home route
        if (route.name === 'home') {
          route.addAlias('/')
        }
      },
    }),
    vue(),
    vueJsx(),
    vueDevTools(),
    AutoImport({
      imports: [
        {
          vue: ['ref', 'onMounted', 'computed'],
        },
        VueRouterAutoImports,
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['lodash.debounce'],
  },
})
