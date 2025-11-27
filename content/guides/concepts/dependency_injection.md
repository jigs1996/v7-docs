---
summary: Learn how dependency injection works in AdonisJS and how to use the IoC container to manage class dependencies automatically.
---

# Dependency injection and the IoC container

This guide covers dependency injection and the IoC container in AdonisJS. You will learn how to use the `@inject` decorator for automatic dependency resolution and how constructor and method injection work in AdonisJS classes.

The guide also covers when and how to use the IoC container manually with `container.make` and `container.call`. You will see how to register bindings and singletons for classes requiring custom resolution logic, how to implement the adapter pattern using abstract classes, and how to use contextual dependencies to inject different implementations based on the consuming class.

Finally, you will learn how to swap dependencies during testing and how to listen to container resolution events.

## Overview

Dependency injection is a design pattern that eliminates the need to manually create and manage class dependencies. Instead of creating dependencies inside a class, you declare them as constructor parameters or method parameters, and the IoC container resolves them automatically.

AdonisJS includes a powerful IoC (Inversion of Control) container that handles dependency injection throughout your application. When you type-hint a class as a dependency, the container automatically creates an instance of that class and injects it where needed.

The IoC container is already integrated into core parts of AdonisJS including [controllers](../http/controllers.md), [middleware](../http/middleware.md), [event listeners](../diving_deeper/emitter.md), and [Ace commands](../cli/introduction.md). This means you can type-hint dependencies in these classes and they'll be resolved automatically when the framework constructs them.

:::note
AdonisJS uses TypeScript's `experimentalDecorators` and `emitDecoratorMetadata` compiler options to enable dependency injection. These are pre-configured in the `tsconfig.json` file of new AdonisJS projects.
:::

## Your first dependency injection

Let's start with a practical example. We'll create an `AvatarService` that generates Gravatar URLs for users, then inject it into a controller.

::::steps

:::step{title="Create the service"}

First, create a service class that will be injected. This service generates Gravatar avatar URLs based on user email addresses.
```ts
// title: app/services/avatar_service.ts
import User from '#models/user'
import { createHash } from 'node:crypto'

export class AvatarService {
  protected getGravatarAvatar(user: User) {
    const emailHash = createHash('md5').update(user.email).digest('hex')
    const url = new URL(emailHash, 'https://gravatar.com/avatar/')

    url.searchParams.set('size', '200')
    return url.toString()
  }

  getAvatarFor(user: User) {
    return this.getGravatarAvatar(user)
  }
}
```

:::

:::step{title="Inject the service into a controller"}

Next, create a controller that uses the `AvatarService`. The `@inject()` decorator tells the container to automatically resolve and inject the service.
```ts
// title: app/controllers/users_controller.ts
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AvatarService } from '#services/avatar_service'
import User from '#models/user'

@inject()
export default class UsersController {
  /**
   * The AvatarService is automatically injected by the container
   * when this controller is constructed
   */
  constructor(protected avatarService: AvatarService) {}

  async store({ request }: HttpContext) {
    /**
     * Create a new user (simplified for demonstration)
     */
    const user = await User.create(request.only(['email', 'username']))
    
    /**
     * Use the injected service to generate and save the avatar URL
     */
    const avatarUrl = this.avatarService.getAvatarFor(user)
    user.avatarUrl = avatarUrl
    await user.save()
    
    return user
  }
}
```

:::

:::step{title="Register the route"}

Finally, connect your controller to a route. When you visit this endpoint, AdonisJS automatically constructs the controller using the container, which resolves the `AvatarService` dependency.
```ts
// title: start/routes.ts
import router from '@adonisjs/core/services/router'
const UsersController = () => import('#controllers/users_controller')

router.post('/users', [UsersController, 'store'])
```

A few important things to understand about this example. First, the `@inject()` decorator is required on the `UsersController` class. Without it, the container won't know to resolve the `AvatarService` dependency. Second, the decorator uses TypeScript's reflection capabilities to detect constructor dependencies at runtime. Finally, when you visit the `/users` endpoint, the container automatically handles creating both the controller and the service instances.

:::tip

**Common mistake**: Forgetting the `@inject()` decorator

**What happens**: Your dependency will be `undefined`, leading to errors when you try to use it.

**Why**: Without the decorator, the container doesn't know which dependencies to resolve. It relies on the metadata that `@inject()` stores on your class.

**The fix**: Always add `@inject()` above your class definition when using constructor injection.

:::

:::wondering

Why use the container to create an instance of the `AvatarService` class when you can do it manually?

In this simple case, you could create the service manually. However, imagine a dependency graph where the `AvatarService` has its own dependencies, and those dependencies have more dependencies.

The role of the IoC container is to eliminate the need to manually create a tree of dependencies and let the container handle that for you. As your application grows, this automation becomes invaluable.

:::
::::

### What you learned

You now know how to:
- ✓ Use the `@inject()` decorator to enable automatic dependency resolution
- ✓ Type-hint class dependencies in constructor parameters
- ✓ Understand that controllers are automatically constructed using the container
- ✓ Connect routes to controllers that use dependency injection

## Method injection

Method injection works similarly to constructor injection, but instead of resolving dependencies for the entire class, the container resolves dependencies for a specific method. This is useful when only one method needs a particular dependency, or when you want to keep the class constructor simple.

The `@inject()` decorator must be placed before the method when using method injection.
```ts
// title: app/controllers/users_controller.ts
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { AvatarService } from '#services/avatar_service'
import User from '#models/user'

export default class UsersController {
  /**
   * The @inject decorator on the method tells the container
   * to resolve the avatarService parameter automatically
   */
  @inject()
  async store({ request }: HttpContext, avatarService: AvatarService) {
    const user = await User.create(request.only(['email', 'username']))
    
    /**
     * Use the injected service directly as a method parameter
     */
    const avatarUrl = avatarService.getAvatarFor(user)
    user.avatarUrl = avatarUrl
    await user.save()
    
    return user
  }
}
```

Notice that `HttpContext` is always the first parameter for controller methods, followed by any dependencies you want to inject. The container automatically distinguishes between the HTTP context and injectable dependencies.

## What can be injected?

You can type-hint and inject only classes inside other classes. Since TypeScript types and interfaces are removed at compile time and are not visible to the runtime code, there is no way for the container to resolve them.

:::tip

**Common mistake**: Trying to inject interfaces or TypeScript types

**What happens**: Your dependency will be `undefined` at runtime.

**Why**: Interfaces and types don't exist in JavaScript—they're stripped away during compilation. The container has nothing to resolve at runtime. Additionally, auto-import features in editors may import classes as types (using `import type`), which also prevents runtime resolution.

**The fix**: 
- Only inject concrete classes, not interfaces or types
- Check your imports—change `import type { MyClass }` to `import { MyClass }`
- If you need polymorphism, use abstract classes instead (covered in the advanced section)

:::

If a class has other dependencies like configuration objects that cannot be auto-resolved, you must register the class as a binding within the container. We'll cover bindings in the intermediate section.

## Which classes support dependency injection

The following classes are automatically constructed by the container, allowing you to use constructor injection and, in some cases, method injection.

| Class Type | Constructor Injection | Method Injection |
|---|---|---|
| Controllers | ✓ Yes | ✓ Yes (all methods) |
| Middleware | ✓ Yes | ✗ No |
| Event listeners | ✓ Yes | ✓ Yes (only `handle` method) |
| Ace commands | ✗ No | ✓ Yes (only `prepare`, `interact`, `run`, `completed` methods) |
| Bouncer policies | ✓ Yes | ✗ No |

For any other classes you create, you'll need to use the container manually to construct them, which we'll cover in the next section.

## Intermediate: Using the container manually

While AdonisJS automatically constructs controllers, middleware, and other framework classes using the container, you may need to manually construct your own classes in certain scenarios. For example, if you're implementing a queue system and want each job class to benefit from dependency injection, you'll need to use the container's API directly.

### Constructing classes with container.make

The `container.make` method accepts a class constructor and returns an instance of it, automatically resolving all constructor dependencies marked with `@inject()`.

The container instance is available throughout your AdonisJS application via the `app` service.

:::codegroup
```ts
// title: app/services/user_service.ts
import { inject } from '@adonisjs/core'

class LoggerService {
  log(message: string) {
    console.log(message)
  }
}

@inject()
export class UserService {
  /**
   * LoggerService will be automatically injected
   * when we use container.make
   */
  constructor(public logger: LoggerService) {}
  
  createUser(data: any) {
    this.logger.log('Creating user...')
    // User creation logic
  }
}
```
```ts
// title: app/jobs/process_user_job.ts
import app from '@adonisjs/core/services/app'
import { UserService } from '#services/user_service'

export default class ProcessUserJob {
  async handle(userData: any) {
    /**
     * Manually construct UserService using the container.
     * Its LoggerService dependency is automatically resolved.
     */
    const userService = await app.container.make(UserService)
    
    await userService.createUser(userData)
  }
}
```

:::

The container recursively resolves the entire dependency tree. If `UserService` had dependencies, and those dependencies had their own dependencies, the container would resolve them all automatically.

### Calling methods with container.call

You can perform method injection on any class method using the `container.call` method. This is useful when you want dependencies injected into a specific method rather than the entire class.

:::codegroup
```ts
// title: app/services/notification_service.ts
import { inject } from '@adonisjs/core'

class EmailService {
  send(to: string, message: string) {
    console.log(`Sending email to ${to}`)
  }
}

export class NotificationService {
  /**
   * The @inject decorator on the method enables
   * automatic dependency resolution for this method
   */
  @inject()
  notify(userId: string, message: string, emailService: EmailService) {
    emailService.send(`user-${userId}@example.com`, message)
  }
}
```
```ts
// title: Usage example
import app from '@adonisjs/core/services/app'
import { NotificationService } from '#services/notification_service'

/**
 * Create the service instance (no dependencies in constructor)
 */
const notificationService = await app.container.make(NotificationService)

/**
 * Call the method using the container.
 * The EmailService dependency is automatically resolved and injected.
 * The first two arguments are runtime values we provide.
 */
await app.container.call(
  notificationService,
  'notify',
  ['user-123', 'Welcome to our platform!']
)
```

:::

The `container.call` method accepts the class instance, the method name, and an array of runtime values. Runtime values are passed as the initial parameters, followed by any auto-resolved dependencies.

## Intermediate: Bindings

Bindings are the mechanism you use when classes require dependencies that cannot be auto-resolved with the `@inject()` decorator. For example, when a class needs a configuration object or a primitive value alongside its class dependencies.

When a binding exists for a class, the container disables its auto-resolution logic and uses your factory function to create instances instead.

### Creating a binding

Bindings must be registered in the `register` method of a [Service Provider](./service_providers.md). You can create a new provider using the `node ace make:provider` command.

Let's create a `Cache` class that requires both a `RedisConnection` and a configuration object:

:::codegroup
```ts
// title: app/services/cache.ts
export type CacheConfig = {
  ttl: string | number
  grace: boolean
}

/**
 * Since we're registering this class as a binding,
 * there's no need to use the @inject decorator.
 * The container will use our factory function instead.
 */
export class Cache {
  constructor(
    public store: RedisConnection,
    public config: CacheConfig
  ) {}
  
  async get(key: string) {
    // Cache implementation
  }
  
  async set(key: string, value: any) {
    // Cache implementation
  }
}
```
```ts
// title: providers/cache_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import redis from '@adonisjs/redis/services/main'
import { Cache } from '#services/cache'

export default class CacheProvider {
  constructor(protected app: ApplicationService) {}
  
  register() {
    /**
     * Register a binding for the Cache class.
     * The factory function receives a resolver that can
     * create instances of other classes.
     */
    this.app.container.bind(Cache, async (resolver) => {
      /**
       * Get the Redis connection (could also be injected)
       */
      const store = redis.connection()
      
      /**
       * Get configuration from the app config
       */
      const config = this.app.config.get<CacheConfig>('cache')
      
      /**
       * Manually construct and return the Cache instance
       * with all its dependencies
       */
      return new Cache(store, config)
    })
  }
}
```
```ts
// title: Using the Cache binding
import app from '@adonisjs/core/services/app'
import { Cache } from '#services/cache'

/**
 * The container uses our factory function from the binding
 * instead of trying to auto-resolve dependencies
 */
const cache = await app.container.make(Cache)

await cache.set('user:1', { name: 'Virk' })
const user = await cache.get('user:1')
```

:::

Bindings give you complete control over how a class is constructed. The factory function receives a resolver that you can use to create other dependencies, allowing you to build complex dependency trees with custom logic.

### Singletons

Singletons are bindings that are constructed only once and then cached. Multiple calls to `container.make` for a singleton will return the same instance. This is useful for services that should be shared across your application, like database connections or caching layers.
```ts
// title: providers/cache_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import redis from '@adonisjs/redis/services/main'
import { Cache } from '#services/cache'

export default class CacheProvider {
  constructor(protected app: ApplicationService) {}
  
  register() {
    /**
     * Use singleton instead of bind.
     * The Cache instance will be created once and reused.
     */
    this.app.container.singleton(Cache, async (resolver) => {
      const store = redis.connection()
      const config = this.app.config.get<CacheConfig>('cache')
      return new Cache(store, config)
    })
  }
}
```

Now every call to `app.container.make(Cache)` returns the exact same `Cache` instance, making it efficient and ensuring shared state when needed.

### Aliases

Aliases provide alternate string-based names for bindings, allowing you to request dependencies using descriptive names instead of class constructors. This is particularly useful when creating framework-agnostic code or when you want more readable service references.
```ts
// title: providers/cache_provider.ts
export default class CacheProvider {
  constructor(protected app: ApplicationService) {}
  
  register() {
    /**
     * Register the Cache binding as a singleton
     */
    this.app.container.singleton(Cache, async (resolver) => {
      const store = redis.connection()
      const config = this.app.config.get<CacheConfig>('cache')
      return new Cache(store, config)
    })
    
    /**
     * Create an alias so we can reference Cache by the string 'cache'
     */
    this.app.container.alias('cache', Cache)
  }
}
```
```ts
// title: Using the alias
import app from '@adonisjs/core/services/app'

/**
 * Request the cache using the string alias instead of the class
 */
const cache = await app.container.make('cache')
```

String-based aliases are not type-safe by default. However, you can provide type safety using TypeScript's declaration merging. Add this code in your Service Provider file:
```ts
// title: providers/cache_provider.ts
import { Cache } from '#services/cache'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    cache: Cache
  }
}

export default class CacheProvider {
  // ... provider implementation
}
```

Now TypeScript knows that `app.container.make('cache')` returns a `Cache` instance, giving you full autocomplete and type checking.

## Intermediate: Dependency injection during HTTP requests

The `HttpContext` object receives an isolated container resolver for each HTTP request. This allows you to register singleton instances that exist only for the duration of that specific request, which is useful for request-scoped services like loggers or user sessions.

These request-scoped bindings should be registered in the `app/middleware/container_bindings_middleware.ts` file, which is pre-created and automatically registered in new AdonisJS applications.
```ts
// title: app/middleware/container_bindings_middleware.ts
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Logger } from '@adonisjs/core/logger'

export default class ContainerBindingsMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    /**
     * Register the HttpContext itself as a binding.
     * Any class that type-hints HttpContext will receive
     * this exact context instance for the current request.
     */
    ctx.containerResolver.bindValue(HttpContext, ctx)
    
    /**
     * Register the request-specific logger.
     * All classes resolved during this request that depend
     * on Logger will receive this logger instance.
     */
    ctx.containerResolver.bindValue(Logger, ctx.logger)
    
    /**
     * You can bind additional request-scoped values here
     * based on your application's needs
     */
    
    return next()
  }
}
```

Throughout the current HTTP request, any classes that type-hint `HttpContext` or `Logger` as dependencies will receive the exact instances registered here. This ensures consistency and proper scoping for request-specific data.

:::warning

**Important**: Request-scoped bindings are only available during HTTP requests

**What happens**: If you try to resolve a request-scoped dependency outside of an HTTP request context (like in a console command or background job), you'll receive an error stating the container cannot construct the class.

**Why**: The bindings registered in `ContainerBindingsMiddleware` only exist during HTTP request processing. Outside of that context, the container doesn't have access to the `HttpContext` or request-specific logger.

**The solution**: For code that runs outside HTTP requests (commands, jobs, etc.), either:
- Don't depend on request-scoped bindings
- Create your own scoped bindings for that context
- Pass required values as runtime parameters

:::

## Advanced: Runtime values with dependency injection

:::warning
This section covers advanced container usage. Make sure you're comfortable with basic dependency injection and bindings before proceeding.
:::

Sometimes you need to pass runtime values alongside auto-injected dependencies. For example, a service might need a configuration object as its first parameter, followed by type-hinted class dependencies.

Runtime values are provided as an array of positional arguments. When present, they take precedence over the container's auto-resolution logic for their respective positions.

:::codegroup
```ts
// title: app/services/user_service.ts
import { inject } from '@adonisjs/core'

class EchoService {
  echo(message: string) {
    console.log(message)
  }
}

@inject()
export class UserService {
  /**
   * First parameter is a config object (cannot be auto-resolved).
   * Second parameter is a class dependency (auto-resolved).
   */
  constructor(
    public config: { softDeletes: boolean },
    public echo: EchoService
  ) {}

  @inject()
  notify(message: string, echoService: EchoService) {
    /**
     * First parameter is a runtime value.
     * Second parameter is auto-injected.
     */
    echoService.echo(message)
  }
}
```
```ts
// title: Providing runtime values
import app from '@adonisjs/core/services/app'
import { UserService } from '#services/user_service'

/**
 * Pass runtime values as the second argument to container.make.
 * The config object fills the first constructor parameter.
 * EchoService is still auto-resolved for the second parameter.
 */
const userService = await app.container.make(
  UserService,
  [{ softDeletes: true }]
)

/**
 * Pass runtime values to method calls.
 * The message string fills the first method parameter.
 * EchoService is still auto-resolved for the second parameter.
 */
await app.container.call(
  userService,
  'notify',
  ['User created with id 1']
)
```

:::

Runtime values must be in the correct order. The container matches them positionally to your constructor or method parameters, using runtime values first and then filling remaining parameters with auto-resolved dependencies.

## Advanced: Abstract classes as interfaces

:::warning
This section covers the adapter pattern using abstract classes. Ensure you understand basic dependency injection and bindings before implementing this pattern.
:::

Since TypeScript interfaces are removed at runtime, you cannot use them as injection tokens. However, you can use abstract classes to achieve the same polymorphic behavior. This enables you to implement the Adapter design pattern, where multiple implementations conform to a common contract.

Let's create a payment service that can work with different payment providers:
```ts
// title: app/services/payment_service.ts
/**
 * Abstract class acts as the interface.
 * Different payment providers will implement this.
 */
export default abstract class PaymentService {
  abstract charge(amount: number): Promise<void>
  abstract refund(amount: number): Promise<void>
}
```
```ts
// title: app/services/stripe_provider.ts
import PaymentService from './payment_service.js'

export default class StripeProvider implements PaymentService {
  async charge(amount: number) {
    console.log(`Charging ${amount} via Stripe`)
    // Stripe-specific implementation
  }

  async refund(amount: number) {
    console.log(`Refunding ${amount} via Stripe`)
    // Stripe-specific implementation
  }
}
```
```ts
// title: app/services/paypal_provider.ts
import PaymentService from './payment_service.js'

export default class PaypalProvider implements PaymentService {
  async charge(amount: number) {
    console.log(`Charging ${amount} via PayPal`)
    // PayPal-specific implementation
  }

  async refund(amount: number) {
    console.log(`Refunding ${amount} via PayPal`)
    // PayPal-specific implementation
  }
}
```

Now you can register a binding that tells the container which implementation to use when someone requests `PaymentService`:
```ts
// title: providers/app_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import PaymentService from '#services/payment_service'
import StripeProvider from '#services/stripe_provider'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    /**
     * Bind the abstract PaymentService to the concrete StripeProvider.
     * Any class that type-hints PaymentService will receive StripeProvider.
     */
    this.app.container.bind(PaymentService, () => {
      return new StripeProvider()
    })
  }
}
```
```ts
// title: app/controllers/checkout_controller.ts
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import PaymentService from '#services/payment_service'

export default class CheckoutController {
  /**
   * Type-hint the abstract PaymentService.
   * The container injects StripeProvider (based on our binding).
   */
  @inject()
  async store({ request }: HttpContext, paymentService: PaymentService) {
    const amount = request.input('amount')
    
    /**
     * We call methods on PaymentService, but the actual
     * implementation is StripeProvider
     */
    await paymentService.charge(amount)
    
    return { success: true }
  }
}
```

This pattern allows you to swap payment providers by changing a single binding, without modifying any code that depends on `PaymentService`. Your business logic remains decoupled from the specific implementation.

## Advanced: Contextual dependencies

:::warning
This is an advanced container pattern. You should be thoroughly comfortable with bindings and dependency injection before using contextual dependencies.
:::

Contextual dependencies allow you to inject different implementations of the same abstract class or interface based on which class is requesting it. This is useful when different parts of your application need different configurations or implementations of the same service.

For example, you might have two services that both need a `Disk` instance, but they should use different storage drivers:
```ts
// title: app/services/user_service.ts
import { inject } from '@adonisjs/core'
import { Disk } from '@adonisjs/drive'

@inject()
export default class UserService {
  /**
   * UserService will receive a Disk instance
   * configured for R2 storage
   */
  constructor(protected disk: Disk) {}
  
  async uploadAvatar(file: MultipartFile) {
    await this.disk.put(`avatars/${file.clientName}`, file)
  }
}
```
```ts
// title: app/services/post_service.ts
import { inject } from '@adonisjs/core'
import { Disk } from '@adonisjs/drive'

@inject()
export default class PostService {
  /**
   * PostService will receive a Disk instance
   * configured for S3 storage
   */
  constructor(protected disk: Disk) {}
  
  async uploadImage(file: MultipartFile) {
    await this.disk.put(`posts/${file.clientName}`, file)
  }
}
```

Register contextual dependencies in a Service Provider using the `when().asksFor().provide()` API:
```ts
// title: providers/app_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import { Disk } from '@adonisjs/drive'
import UserService from '#services/user_service'
import PostService from '#services/post_service'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    /**
     * When UserService asks for Disk, provide R2 implementation
     */
    this.app.container
      .when(UserService)
      .asksFor(Disk)
      .provide(async (resolver) => {
        const driveManager = await resolver.make('drive.manager')
        return driveManager.use('r2')
      })

    /**
     * When PostService asks for Disk, provide S3 implementation
     */
    this.app.container
      .when(PostService)
      .asksFor(Disk)
      .provide(async (resolver) => {
        const driveManager = await resolver.make('drive.manager')
        return driveManager.use('s3')
      })
  }
}
```

Now `UserService` automatically receives a Disk configured for R2, while `PostService` receives one configured for S3, all through the same `Disk` type hint. This keeps your service code clean while allowing fine-grained control over dependencies.

## Intermediate: Swapping dependencies during testing

The container provides a straightforward API for swapping dependencies with fake implementations during tests. This allows you to test your code in isolation without hitting real external services.

The `container.swap` method replaces a binding with a temporary implementation, and `container.restore` reverts it back to the original. During the swap, any part of your codebase that type-hints the swapped class will receive the fake implementation instead.
```ts
// title: tests/functional/users/list.spec.ts
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import UserService from '#services/user_service'

test('get all users', async ({ client, cleanup }) => {
  /**
   * Create a fake implementation that extends the real service
   */
  class FakeUserService extends UserService {
    /**
     * Override the all() method to return fake data
     * instead of querying the database
     */
    all() {
      return [
        { id: 1, username: 'virk', email: 'virk@adonisjs.com' },
        { id: 2, username: 'romain', email: 'romain@adonisjs.com' }
      ]
    }
  }
  
  /**
   * Swap UserService with our fake implementation.
   * Any code that resolves UserService during this test
   * will receive FakeUserService instead.
   */
  app.container.swap(UserService, () => {
    return new FakeUserService()
  })
  
  /**
   * Restore the original binding after the test completes.
   * The cleanup hook ensures this runs even if the test fails.
   */
  cleanup(() => app.container.restore(UserService))
  
  /**
   * Make the HTTP request. The controller will receive
   * FakeUserService, which returns our fake data.
   */
  const response = await client.get('/users')
  
  response.assertStatus(200)
  response.assertBodyContains({ 
    users: [
      { username: 'virk' },
      { username: 'romain' }
    ]
  })
})
```

Swapping is particularly valuable when testing code that depends on external APIs, payment gateways, email services, or any other resource you don't want to interact with during automated tests. The fake implementation can simulate various scenarios (success, failure, edge cases) without requiring real infrastructure.

## Container events

The container emits events when it resolves bindings, allowing you to observe and react to dependency resolution. This can be useful for debugging, monitoring, or implementing cross-cutting concerns.

The container emits a single event type: `container_binding:resolved`. This event is triggered every time the container successfully resolves a class instance, whether through auto-resolution, bindings, or singletons.

You can listen to this event using the application's event emitter:
```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

emitter.on('container_binding:resolved', (event) => {
  /**
   * event.binding contains the class constructor or string alias
   * that was resolved
   */
  console.log('Resolved binding:', event.binding)
  
  /**
   * event.value contains the actual instance that was created
   */
  console.log('Instance:', event.value)
})
```

The event object provides two properties. First, `event.binding` contains the binding key (either a class constructor or string alias) that was resolved. Second, `event.value` contains the actual instance that the container created and returned.

This event is fired for every resolution, including nested dependencies. For example, if the container resolves `UserService`, which depends on `LoggerService`, you'll receive two events: one for `LoggerService` and one for `UserService`.

:::warning

**Important**: Circular dependencies are not supported

**What happens**: If Class A depends on Class B, which depends on Class A, the container will enter an infinite loop and your application will crash with a stack overflow error.

**Why**: Circular dependencies represent a design problem where two classes are too tightly coupled. The container cannot resolve such dependencies because each class needs the other to be constructed first.

**The solution**: Refactor your code to break the circular dependency:
- Extract shared logic into a third service that both classes can depend on
- Use events or callbacks instead of direct dependencies
- Reconsider your class responsibilities—circular dependencies often indicate improper separation of concerns

:::

## See also

- [Service Providers](./service_providers.md) - Learn how to register bindings and organize application bootstrapping
- [The IoC Container README](https://github.com/adonisjs/fold/blob/develop/README.md) - Comprehensive API documentation in a framework-agnostic context
- [Why Do You Need an IoC Container?](https://github.com/thetutlage/meta/discussions/4) - The framework creator's reasoning for using dependency injection
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) - Understanding the decorator syntax used by `@inject()`
