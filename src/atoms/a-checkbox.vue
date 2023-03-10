<template>
  <v-checkbox
    class="a-checkbox"
    density="compact"
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
.a-checkbox {
  ::v-deep(.v-input__details) {
    display: none;
  }
}
</style>
