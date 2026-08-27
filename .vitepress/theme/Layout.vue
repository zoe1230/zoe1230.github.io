<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed, useSlots } from 'vue'

const { Layout } = DefaultTheme
const { page } = useData()
const slots = useSlots()

const isHome = computed(
  () => page.value.relativePath.replace(/\\/g, '/') === 'index.md',
)
</script>

<template>
  <Layout :class="{ 'is-home': isHome }">
    <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
    <template #layout-bottom>
      <footer class="site-footer">
        <p class="site-footer-copy">© Zhanhong Chen, 2026</p>
      </footer>
    </template>
  </Layout>
</template>
