# Dependency Injection and IoC Container

## Overview

- AdonisJS provides IoC (Inversion of Control) container for automatic dependency resolution
- TypeScript's `experimentalDecorators` and `emitDecoratorMetadata` enable DI (pre-configured in new projects)
- Container auto-resolves class dependencies when type-hinted
- Integrated into controllers, middleware, event listeners, and Ace commands

## Basic Usage

### Constructor Injection

```ts
// Service to be injected
export class AvatarService {
  getAvatarFor(user: User) {
    const emailHash = createHash('md5').update(user.email).digest('hex')
    return `https://gravatar.com/avatar/${emailHash}?size=200`
  }
}
```

```ts
// Controller with injected service
import { inject } from '@adonisjs/core'
import { AvatarService } from '#services/avatar_service'

@inject()
export default class UsersController {
  constructor(protected avatarService: AvatarService) {}

  async store({ request }: HttpContext) {
    const user = await User.create(request.only(['email', 'username']))
    user.avatarUrl = this.avatarService.getAvatarFor(user)
    await user.save()
    return user
  }
}
```

**Requirements:**
- Use `@inject()` decorator on class
- Import class as value, NOT as type (`import { Class }` not `import type { Class }`)
- Only classes can be injected (not interfaces or types - they're removed at compile time)

### Method Injection

```ts
export default class UsersController {
  @inject()
  async store({ request }: HttpContext, avatarService: AvatarService) {
    // HttpContext is always first parameter
    // Injected dependencies follow
    const avatarUrl = avatarService.getAvatarFor(user)
  }
}
```

## Framework Support

| Class Type | Constructor Injection | Method Injection |
|---|---|---|
| Controllers | ✅ | ✅ |
| Middleware | ✅ | ❌ |
| Event listeners | ✅ | ✅ (only `handle` method) |
| Bouncer policies | ✅ | ❌ |
| Transformers | ❌ | ✅ |
| Ace commands | ❌ | ✅ (only lifecycle methods) |

## Manual Container Usage

### container.make()

```ts
import app from '@adonisjs/core/services/app'
import { UserService } from '#services/user_service'

// Constructs class and resolves all dependencies
const userService = await app.container.make(UserService)
```

### container.call()

```ts
import app from '@adonisjs/core/services/app'

const notificationService = await app.container.make(NotificationService)

// Call method with auto-resolved dependencies
// Runtime values first, then auto-resolved dependencies
await app.container.call(
  notificationService,
  'notify',
  ['user-123', 'Welcome!'] // runtime values
)
```

## Bindings

Register custom construction logic for classes with complex dependencies.

### Basic Binding

```ts
// providers/cache_provider.ts
export default class CacheProvider {
  register() {
    this.app.container.bind(Cache, async (resolver) => {
      const redis = await resolver.make('redis')
      const store = redis.connection()
      const config = this.app.config.get<CacheConfig>('cache')
      return new Cache(store, config)
    })
  }
}
```

### Singletons

```ts
// Created once and cached
this.app.container.singleton(Cache, async (resolver) => {
  const store = redis.connection()
  const config = this.app.config.get<CacheConfig>('cache')
  return new Cache(store, config)
})
```

### Aliases

```ts
// Type-safe string aliases
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    cache: Cache
  }
}

this.app.container.singleton(Cache, factory)
this.app.container.alias('cache', Cache)

// Usage
const cache = await app.container.make('cache')
```

## Request-Scoped Bindings

Register in `app/middleware/container_bindings_middleware.ts`:

```ts
export default class ContainerBindingsMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    // Bindings exist only for this request
    ctx.containerResolver.bindValue(HttpContext, ctx)
    ctx.containerResolver.bindValue(Logger, ctx.logger)
    return next()
  }
}
```

## Abstract Classes as Interfaces

Use abstract classes for polymorphism (interfaces are removed at runtime).

### Define Contract

```ts
export default abstract class PaymentService {
  abstract charge(amount: number): Promise<void>
  abstract refund(amount: number): Promise<void>
}
```

### Implementations

```ts
export default class StripeProvider implements PaymentService {
  async charge(amount: number) {
    console.log(`Charging ${amount} via Stripe`)
  }
  async refund(amount: number) {
    console.log(`Refunding ${amount} via Stripe`)
  }
}

export default class PaypalProvider implements PaymentService {
  async charge(amount: number) {
    console.log(`Charging ${amount} via PayPal`)
  }
  async refund(amount: number) {
    console.log(`Refunding ${amount} via PayPal`)
  }
}
```

### Bind Implementation

```ts
// providers/app_provider.ts
this.app.container.bind(PaymentService, () => {
  return new StripeProvider()
})
```

### Usage

```ts
@inject()
async store({ request }: HttpContext, paymentService: PaymentService) {
  // Receives StripeProvider instance
  await paymentService.charge(amount)
}
```

## Contextual Dependencies

Inject different implementations based on requesting class.

```ts
// providers/app_provider.ts
this.app.container
  .when(SubscriptionService)
  .asksFor(PaymentService)
  .provide(() => new StripeProvider())

this.app.container
  .when(OrderService)
  .asksFor(PaymentService)
  .provide(() => new PaypalProvider())
```

## Testing: Swapping Dependencies

```ts
test('get all users', async ({ client, cleanup }) => {
  class FakeUserService extends UserService {
    all() {
      return [
        { id: 1, username: 'virk' },
        { id: 2, username: 'romain' }
      ]
    }
  }

  // Swap with fake
  app.container.swap(UserService, () => new FakeUserService())

  // Restore after test
  cleanup(() => app.container.restore(UserService))

  const response = await client.get('/users')
  response.assertStatus(200)
})
```

## Container Events

```ts
import emitter from '@adonisjs/core/services/emitter'

emitter.on('container_binding:resolved', (event) => {
  console.log('Resolved:', event.binding)
  console.log('Instance:', event.value)
})
```

**Event properties:**
- `event.binding` - class constructor or string alias
- `event.value` - created instance
- Fires for every resolution including nested dependencies

## Common Pitfalls

**Import type error:**
```ts
// ❌ Wrong - import as type
import type { AvatarService } from '#services/avatar_service'

// ✅ Correct - import as value
import { AvatarService } from '#services/avatar_service'
```

**What can be injected:**
- ✅ Classes only
- ❌ TypeScript types/interfaces (removed at compile time)
- ❌ Primitive values (use bindings for complex dependencies)

## Reference

- [Service Providers](./service_providers.md)
- [IoC Container API](https://github.com/adonisjs/fold/blob/develop/README.md)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
