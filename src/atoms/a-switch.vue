<template>
  <v-switch
    class="a-switch"
    density="compact"
    variant="outlined"
    v-bind="$attrs"
  />
</template>

<style lang="scss" scoped>
.a-switch {
  ::v-deep(.v-input__details) {
    display: none;
  }
}
</style>

