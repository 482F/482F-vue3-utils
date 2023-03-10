<template>
  <v-text-field
    class="a-text-field"
    density="compact"
    variant="outlined"
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
.a-text-field {
  ::v-deep(.v-input__details) {
    display: none;
  }
}
</style>