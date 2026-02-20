---
description: Reference guide for TypeScript type helper utilities available in AdonisJS for type inference and manipulation.
---

# Types helpers

## InferRouteParams<Identifier>

Infer params of a route pattern. The params must be defined as per the AdonisJS routing syntax.

```ts
import type { InferRouteParams } from '@adonisjs/core/helpers/types'

InferRouteParams<'/users'> // {}
InferRouteParams<'/users/:id'> // { id: string }
InferRouteParams<'/users/:id?'> // { id?: string }
InferRouteParams<'/users/:id/:slug?'> // { id: string; slug?: string }
InferRouteParams<'/users/:id.json'> // { id: string }
InferRouteParams<'/users/*'> // { '*': string[] }
InferRouteParams<'/posts/:category/*'> // { 'category': string; '*': string[] }
```

## Prettify<T>

Prettifies the complex TypeScript types to a simplified type for a better viewing experience. For example:

```ts
import type { Prettify } from '@adonisjs/core/helpers/types'
import type { ExtractDefined, ExtractUndefined } from '@adonisjs/core/helpers/types'

type Values = {
  username: string | undefined
  email: string
  fullName: string | undefined
  age: number | undefined
}

// When not using prettify helper
type WithUndefinedOptional = {
  [K in ExtractDefined<Values>]: Values[K]
} & {
  [K in ExtractUndefined<Values>]: Values[K]
}

// When using prettify helper
type WithUndefinedOptionalPrettified = Prettify<
  {
    [K in ExtractDefined<Values>]: Values[K]
  } & {
    [K in ExtractUndefined<Values>]: Values[K]
  }
>
```

## Primitive

Union of primitive types. It includes `null | undefined | string | number | boolean | symbol | bigint`

```ts
import type { Primitive } from '@adonisjs/core/helpers/types'

function serialize(
  values:
    | Primitive
    | Record<string, Primitive | Primitive[]>
    | Primitive[]
    | Record<string, Primitive | Primitive[]>[]
) {}
```

## OneOrMore<T>

Specify a union that accepts either `T` or `T[]`.

```ts
import type { OneOrMore } from '@adonisjs/core/helpers/types'
import type { Primitive } from '@adonisjs/core/helpers/types'

function serialize(
  values: OneOrMore<Primitive> | OneOrMore<Record<string, Primitive | Primitive[]>>
) {}
```

## Constructor<T, Arguments>

Represent a class constructor. The `T` refers to the class instance properties, and `Arguments` refers to the constructor arguments.

```ts
import type { Constructor } from '@adonisjs/core/helpers/types'

function make<Args extends any[]>(Klass: Constructor<any, Args>, ...args: Args) {
  return new Klass(...args)
}
```

## AbstractConstructor<T, Arguments>

Represent a class constructor that could also be abstract. The `T` refers to the class instance properties, and `Arguments` refers to the constructor arguments.

```ts
import type { AbstractConstructor } from '@adonisjs/core/helpers/types'
function log<Args extends any[]>(Klass: AbstractConstructor<any, Args>, ...args: Args) {}
```

## LazyImport<DefaultExport>

Represent a function that lazily imports a module with `export default`.

```ts
import type { LazyImport, Constructor } from '@adonisjs/core/helpers/types'

function middleware(list: LazyImport<Constructor<{ handle(): any }>>[]) {}
```

## UnWrapLazyImport<Fn>

Unwrap the default export of a `LazyImport` function.

```ts
import type { LazyImport, UnWrapLazyImport } from '@adonisjs/core/helpers/types'

type Middleware = LazyImport<Constructor<{ handle(): any }>>
type MiddlewareClass = UnWrapLazyImport<Middleware>
```

## NormalizeConstructor<T>

Normalizes the constructor arguments of a class for use with mixins. The helper is created to work around [TypeScript issue#37142](https://github.com/microsoft/TypeScript/issues/37142).

```ts
// title: Usage without NormalizeConstructor
class Base {}

function DatesMixin<TBase extends typeof Base>(superclass: TBase) {
  // A mixin class must have a constructor with a single rest parameter of type 'any[]'. ts(2545)
  return class HasDates extends superclass {
    //          ❌ ^^
    declare createdAt: Date
    declare updatedAt: Date
  }
}

// Base constructors must all have the same return type.ts(2510)
class User extends DatesMixin(Base) {}
//                    ❌ ^^
```

```ts
// title: Using NormalizeConstructor
import type { NormalizeConstructor } from '@adonisjs/core/helpers/types'

class Base {}

function DatesMixin<TBase extends NormalizeConstructor<typeof Base>>(superclass: TBase) {
  return class HasDates extends superclass {
    declare createdAt: Date
    declare updatedAt: Date
  }
}

class User extends DatesMixin(Base) {}
```

## Opaque<T>

Define an opaque type to distinguish between similar properties.

```ts
import type { Opaque } from '@adonisjs/core/helpers/types'

type Username = Opaque<string, 'username'>
type Password = Opaque<string, 'password'>

function checkUser(_: Username) {}

// ❌ Argument of type 'string' is not assignable to parameter of type 'Opaque<string, "username">'.
checkUser('hello')

// ❌ Argument of type 'Opaque<string, "password">' is not assignable to parameter of type 'Opaque<string, "username">'.
checkUser('hello' as Password)

checkUser('hello' as Username)
```

## UnwrapOpaque<T>

Unwrap the value from an opaque type.

```ts
import type { Opaque, UnwrapOpaque } from '@adonisjs/core/helpers/types'

type Username = Opaque<string, 'username'>
type Password = Opaque<string, 'password'>

type UsernameValue = UnwrapOpaque<Username> // string
type PasswordValue = UnwrapOpaque<Password> // string
```

## ExtractFunctions<T, IgnoreList>

Extract all the functions from an object. Optionally specify a list of methods to ignore.

```ts
import type { ExtractFunctions } from '@adonisjs/core/helpers/types'

class User {
  declare id: number
  declare username: string

  create() {}
  update(_id: number, __attributes: any) {}
}

type UserMethods = ExtractFunctions<User> // 'create' | 'update'
```

You may use the `IgnoreList` to ignore methods from a known parent class

```ts
import type { ExtractFunctions } from '@adonisjs/core/helpers/types'

class Base {
  save() {}
}

class User extends Base {
  declare id: number
  declare username: string

  create() {}
  update(_id: number, __attributes: any) {}
}

type UserMethods = ExtractFunctions<User> // 'create' | 'update'
type UserMethodsWithParent = ExtractFunctions<User, ExtractFunctions<Base>> // 'create' | 'update'
```

## AreAllOptional<T>

Check if all the top-level properties of an object are optional.

```ts
import type { AreAllOptional } from '@adonisjs/core/helpers/types'

AreAllOptional<{ id: string; name?: string }> // false
AreAllOptional<{ id?: string; name?: string }> // true
```

## ExtractUndefined<T>

Extract properties that are `undefined` or are a union with `undefined` values.

```ts
import type { ExtractUndefined } from '@adonisjs/core/helpers/types'

type UndefinedProperties = ExtractUndefined<{ id: string; name: string | undefined }>
```

## ExtractDefined<T>

Extract properties that are not `undefined` nor is a union with `undefined` values.

```ts
import type { ExtractDefined } from '@adonisjs/core/helpers/types'

type UndefinedProperties = ExtractDefined<{ id: string; name: string | undefined }>
```

## AsyncOrSync<T>

Define a union with the value or a `PromiseLike` of the value.

```ts
import type { AsyncOrSync } from '@adonisjs/core/helpers/types'

function log(fetcher: () => AsyncOrSync<{ id: number }>) {
  const { id } = await fetcher()
}
```
