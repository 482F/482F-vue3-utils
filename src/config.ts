import { ref, Ref } from 'vue'
import {
  Json,
  JsonNonPrimitive,
  isJsonPrimitive,
  Key,
} from '@482F-utils/ts/src/common'
import throttle from 'lodash/throttle'

const keySymbol = Symbol('key')
const emittedSymbol = Symbol('emitted')

export type RefConfig<Config> = Ref<Config> & { [emittedSymbol]?: boolean }

function splitKey(joinedKey: string) {
  const [, currentKey, restKey] = joinedKey?.match(/^([^.]+)\.?(.*)$/) ?? []
  return [currentKey, restKey]
}
function deepGet<T extends JsonNonPrimitive>(
  target: T,
  joinedKey: string //ex. 'a.b.c'
): unknown {
  const [rawCurrentKey, restKey] = splitKey(joinedKey)
  if (!rawCurrentKey) throw new Error()
  const currentValue = (() => {
    if (Array.isArray(target)) {
      const currentKey = Number(rawCurrentKey)
      return target[currentKey]
    } else {
      const currentKey = rawCurrentKey
      return target[currentKey]
    }
  })()

  if (restKey) {
    if (!currentValue || isJsonPrimitive(currentValue)) throw new Error()
    return deepGet(currentValue, restKey)
  } else {
    return currentValue
  }
}

function deepSet<T extends JsonNonPrimitive>(
  target: T,
  joinedKey: string, // ex. 'a.b.c'
  value: Json,
  defaultTarget: T
) {
  const [rawCurrentKey, restKey] = splitKey(joinedKey)
  if (!rawCurrentKey) throw new Error()

  const [setter, getCurrentValue, getCurrentDefaultValue] = (() => {
    if (Array.isArray(target)) {
      if (!Array.isArray(defaultTarget)) throw new Error()
      const currentKey = Number(rawCurrentKey)
      return [
        (val: Json) => {
          target[currentKey] = val
        },
        () => target[currentKey],
        () => defaultTarget[currentKey],
      ]
    } else {
      if (Array.isArray(defaultTarget)) throw new Error()
      const currentKey = rawCurrentKey
      return [
        (val: Json) => {
          target[currentKey] = val
        },
        () => target[currentKey],
        () => defaultTarget[currentKey],
      ]
    }
  })()

  if (restKey) {
    if (!getCurrentValue()) {
      if (Array.isArray(getCurrentDefaultValue())) {
        setter([])
      } else {
        setter({})
      }
    }
    // 上の if 節で値があることが保証されている (currentValue ??= [] | {} と同義)
    const currentValue = getCurrentValue() as Json
    const currentDefaultValue = getCurrentDefaultValue() as Json
    if (isJsonPrimitive(currentValue) || isJsonPrimitive(currentDefaultValue))
      throw new Error()
    deepSet(currentValue, restKey, value, currentDefaultValue)
  } else {
    setter(value)
  }
  return true
}

type Store = {
  read(key: string): any
  write(key: string, value: any): void
}

async function getInitialConfig<C extends JsonNonPrimitive>(
  defaultConfig: C,
  store: Store
): Promise<C> {
  const keys = (function func(val: Json, prefix: string): string[] {
    if (isJsonPrimitive(val)) return [prefix]
    else
      return Object.entries(val).flatMap(([key, child]) => {
        const nextKey = String(prefix ? prefix + '.' + key : key)
        return func(child, nextKey)
      })
  })(defaultConfig, '')

  const records: Record<string, string> = Object.fromEntries(
    await Promise.all(
      keys.map(async (key) => [key, await store.read(key)])
    ).then((records) =>
      records.sort((a, b) => {
        const ak = a[0]
        const bk = b[0]
        if (ak < bk) return -1
        else if (ak > bk) return 1
        else return 0
      })
    )
  )

  const initialConfig = {}

  keys.map((key) => {
    const defaultValue = deepGet(defaultConfig, key)
    const rawValue =
      records[key] ??
      (() => {
        store.write(key, defaultValue)
        return defaultValue
      })()
    const value = (() => {
      if (typeof defaultValue === 'number') {
        return Number(rawValue)
      } else if (typeof defaultValue === 'boolean') {
        return rawValue === 'true' ? true : false
      } else {
        return rawValue
      }
    })()
    if (!isJsonPrimitive(value)) throw new Error()
    deepSet(initialConfig, key, value, defaultConfig)
  })
  return initialConfig as C
}

type HasKey<T> = T & { [keySymbol]: string }

export async function getConfig<C extends JsonNonPrimitive>(
  defaultConfig: C,
  store: Store,
  writeIntervalMs: number = 100
): Promise<RefConfig<C>> {
  type Consumer = (value: unknown) => void
  const storeWriters: Record<string, ReturnType<typeof throttle<Consumer>>> = {}

  const proxyHandler = {
    set<T extends HasKey<C>>(obj: T, prop: Key, value: unknown): boolean {
      const anyProp = prop as any
      if (!(prop in obj))
        throw new Error(`オブジェクトは '${String(prop)}' メンバを持てません`)
      if (typeof obj[anyProp] !== typeof value)
        throw new Error(
          `'${String(prop)}' メンバの値の型は ${typeof obj[
            anyProp
          ]} である必要があります`
        )

      if (isJsonPrimitive(obj[anyProp])) {
        obj[anyProp] = value as any
      } else {
        Object.assign(obj[anyProp] ?? {}, value as any)
      }

      const key = obj[keySymbol]
        ? obj[keySymbol] + '.' + String(prop)
        : String(prop)

      const storeWriter = (storeWriters[key] ??= throttle((value) => {
        store.write(key, String(value))
      }, writeIntervalMs))
      storeWriter(value)

      return true
    },
  }

  const initialConfig = await getInitialConfig(defaultConfig, store)

  const configProxy = (function func<T extends JsonNonPrimitive>(
    target: T,
    key: string
  ): HasKey<T> {
    const ifunc = (value: Json, childKey: string | number): Json => {
      if (isJsonPrimitive(value)) return value
      else
        return func(
          value,
          key ? key + '.' + String(childKey) : String(childKey)
        )
    }
    const processedTarget: JsonNonPrimitive & { [keySymbol]?: string } =
      (() => {
        if (Array.isArray(target)) {
          return target.map(ifunc)
        } else {
          return Object.fromEntries(
            Object.entries(target).map(([key, value]) => [
              key,
              ifunc(value, key),
            ])
          )
        }
      })()
    processedTarget[keySymbol] = key

    return new Proxy(processedTarget, proxyHandler) as HasKey<T>
  })(initialConfig, '')

  return ref(configProxy) as RefConfig<C>
}
