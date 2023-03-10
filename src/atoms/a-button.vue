<template>
  <v-btn
    class="a-button"
    variant="outlined"
    v-bind="$attrs"
    :color="color ?? 'var(--accent-color)'"
  >
    <v-progress-circular
      v-if="loading"
      indeterminate
      class="progress-circular"
      :size="20"
    />
    <slot v-else></slot>
  </v-btn>
</template>

<script setup lang="ts">
defineProps<{ color?: string; loading?: boolean }>()
</script>

<style lang="scss" scoped>
.a-button {
  .progress-circular {
    outline: none !important;
    ::v-deep(*) {
      outline: none !important;
    }
  }
}
</style>
