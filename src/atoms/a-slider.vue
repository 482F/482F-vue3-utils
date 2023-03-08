<template>
  <v-slider
    class="a-slider"
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
.a-slider {
  ::v-deep(.v-input__details) {
    display: none;
  }
}
</style>
