import { App, Plugin } from 'vue'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $console: Console
  }
}
export const commonPlugin: Plugin = {
  install: (app: App) => {
    const gp = app.config.globalProperties
    gp.$console = console
  },
}

