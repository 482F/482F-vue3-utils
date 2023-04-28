<template>
  <div
    ref="$el"
    class="resizable-layout"
    :style="{
      '--grid-template-areas': gridTemplateAreas,
      '--grid-template-rows': gridTemplate.rows,
      '--grid-template-columns': gridTemplate.columns,
    }"
  >
    <div
      v-for="(def, name) of areaDefs"
      :key="name"
      :name="name"
      :style="{ '--grid-area': name }"
    >
      <slot :name="name" class="content"></slot>
      <div v-if="def.resizable?.bottom" class="resizer bottom">
        <div
          class="inner"
          @mousedown="(e) => onResizeStart(e, name, 'bottom')"
        ></div>
      </div>
      <div v-if="def.resizable?.right" class="resizer right">
        <div
          class="inner"
          @mousedown="(e) => onResizeStart(e, name, 'right')"
        ></div>
      </div>
    </div>
    <!-- <div class="left">
      <slot name="left" :classes="['left']"></slot>
    </div>
    <div class="resizer" ref="resizerEl" @mousedown="onResizeStart"></div>
    <div class="right">
      <slot name="right" :classes="['right']"></slot>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref } from 'vue'

const $el: Ref<HTMLElement | undefined> = ref()
const props = withDefaults(
  defineProps<{
    gridTemplateAreas: string
    areaDefs: {
      [k in string]: {
        resizable?: { bottom?: boolean; right?: boolean }
        size?: {
          width?: { value: number; min?: number; max?: number }
          height?: { value: number; min?: number; max?: number }
        }
      }
    }
  }>(),
  {}
)
const $emit = defineEmits<{
  (e: `update:${string}-${'width' | 'height'}`, newSize: number): void
}>()
const gridTemplate = computed(() => {
  const areaSizes = props.gridTemplateAreas
    .replaceAll(/^\s*['"]|['"]\s*$/g, '')
    .split(/['"]\s*['"]/g)
    .map((row) =>
      row.split(/\s+/).map((areaName) => props.areaDefs[areaName]?.size ?? {})
    )
  function process(sizes: (string | number)[] | undefined) {
    return (
      (sizes
        ?.map((size) => (typeof size === 'number' ? size + 'px' : size))
        .map((size) => `minmax(min-content, ${size})`)
        .join(' ') ||
        '1fr') ??
      ''
    )
  }
  const rows = process(areaSizes.map((row) => row[0]?.height?.value ?? '1fr'))
  const columns = process(
    areaSizes[0]?.map((col) => col?.width?.value ?? '1fr')
  )
  return {
    rows,
    columns,
  }
})

const keys: {
  clientP: 'clientY' | 'clientX'
  size: 'height' | 'width'
  p: 'y' | 'x'
} = {
  clientP: 'clientY',
  size: 'height',
  p: 'y',
}

const resizeState = {
  name: '',
  dir: '',
  initialP: 0,
  initialSize: 0,
  keys,
  resizerEl: undefined as undefined | HTMLElement,
}

function onResizeStart(e: MouseEvent, name: string, dir: 'bottom' | 'right') {
  if (!e.target || !(e.target instanceof HTMLElement)) return

  resizeState.name = name
  resizeState.resizerEl = e.target
  resizeState.keys = (
    {
      bottom: { clientP: 'clientY', size: 'height', p: 'y' },
      right: { clientP: 'clientX', size: 'width', p: 'x' },
    } as const
  )[dir]
  resizeState.initialP = e[resizeState.keys.clientP]
  const initialSize = props.areaDefs[name]?.size?.[resizeState.keys.size]?.value
  if (initialSize === undefined) return
  resizeState.initialSize = initialSize

  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  const end = e[resizeState.keys.clientP]

  const { initialSize, initialP } = resizeState
  updateSize(
    resizeState.name,
    resizeState.keys.size,
    initialSize + end - initialP
  )
}

function onResizeEnd() {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)

  const resizerElSize =
    resizeState.resizerEl?.getBoundingClientRect()[resizeState.keys.p]
  const rootElSize = $el.value?.getBoundingClientRect()[resizeState.keys.p]
  if (resizerElSize === undefined || rootElSize === undefined) return

  console.log({resizerElSize, rootElSize})
  const actualSize = resizerElSize - rootElSize + 4
  updateSize(resizeState.name, resizeState.keys.size, actualSize)
}

function updateSize(name: string, sizeName: 'width' | 'height', value: number) {
  const size = props.areaDefs[name]?.size?.[sizeName]
  const normalizedValue = Math.min(
    Math.max(value, size?.min ?? 0, 0),
    size?.max ?? Infinity
  )
  console.log(`update:${name}-${sizeName}`, normalizedValue)
  $emit(`update:${name}-${sizeName}`, normalizedValue)
}
</script>

<style lang="scss" scoped>
.resizable-layout {
  display: grid;
  grid-template-areas: var(--grid-template-areas);
  grid-template-rows: var(--grid-template-rows);
  grid-template-columns: var(--grid-template-columns);
  > * {
    grid-area: var(--grid-area);
    position: relative;
    > ::v-deep(*:first-of-type) {
      width: 100%;
      height: 100%;
    }
    > .resizer {
      position: absolute;
      z-index: 1;
    }
    > .right {
      height: 100%;
      width: 0px;
      top: 0;
      right: 0;
      > .inner {
        cursor: ew-resize;
        margin-left: -4px;
        width: 8px;
        height: 100%;
      }
    }
    > .bottom {
      height: 0px;
      width: 100%;
      bottom: 0;
      left: 0;
      > .inner {
        cursor: ns-resize;
        margin-top: -4px;
        height: 8px;
        width: 100%;
      }
    }
  }
}
</style>
