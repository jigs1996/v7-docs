# Service Providers

This guide covers service providers in AdonisJS applications. You will learn about the available lifecycle hooks, how to create custom service providers, and how to register bindings into the IoC container.

## Overview

Service providers are JavaScript classes with lifecycle hooks that are executed by AdonisJS as it boots or terminates an application. These hooks are called at specific points during application startup and shutdown, allowing you to execute code at precisely the right moment.

Service providers enable you to perform critical tasks throughout your application's lifetime. You can register bindings to the IoC container, extend parts of the framework using Macros, register Edge template helpers, close database connections during graceful shutdown, or run actions after the HTTP server is ready to accept connections.

The key advantage is centralized initialization logic that runs at predictable times, without modifying core framework code or scattering setup code throughout your application. Every AdonisJS application and package uses service providers to hook into the application lifecycle, making them fundamental to understanding the framework.

## Understanding service providers

Before creating your own service providers, it's helpful to understand how they work within an AdonisJS application.

### Where service providers are registered

Service providers are registered in the `adonisrc.ts` file at the root of your project. This file defines which providers should load and in which runtime environments they should execute.
```ts
// title: adonisrc.ts
import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl', 'test'],
    },
    () => import('@adonisjs/core/providers/http_provider'),
  ],
})
```

Providers use lazy imports with the `() => import()` syntax, ensuring they're only loaded when needed. They execute in array order, so if Provider A must run before Provider B, place Provider A higher in the list. Providers can be restricted to specific runtime environments using the `environment` property—AdonisJS recognizes four environments: `web` (HTTP server), `console` (Ace commands), `repl` (interactive shell), and `test` (testing). Without restrictions, a provider runs in all environments.

### Built-in service providers

A typical AdonisJS application includes several framework providers that handle core functionality. The **app_provider** registers fundamental application services and helpers. The **hash_provider** registers the hash service for password operations. The **repl_provider** adds REPL-specific bindings but only runs in the `repl` and `test` environments. The **http_provider** sets up the HTTP server and related services.

When you install additional packages like `@adonisjs/lucid` for database access or `@adonisjs/auth` for authentication, these packages include their own service providers that you add to this array.

### Execution order and environments

AdonisJS processes providers in array order, calling each provider's lifecycle hooks before moving to the next provider. Environment restrictions determine whether a provider runs at all—for instance, a WebSocket provider configured for the `web` environment won't execute when you run console commands. This combination of execution order and environment filtering gives you precise control over what runs and when.

## Creating a custom service provider

Now that you understand how service providers work, let's create one. This section walks you through building a simple service provider that registers a Cache service into the IoC container.

### Generating the provider

AdonisJS includes a command to generate service provider files:
```bash
node ace make:provider cache
```
```bash
# Output:
# CREATE: providers/cache_provider.ts
```

This command creates the provider file and automatically registers it in your `adonisrc.ts` file.

### Understanding the generated code

Open the generated `providers/cache_provider.ts` file. You'll see a basic provider structure:
```ts
// title: providers/cache_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class CacheProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Called when the provider is registered
   */
  register() {}

  /**
   * Called when the application boots
   */
  async boot() {}

  /**
   * Called when the application starts
   */
  async start() {}

  /**
   * Called when the application is ready
   */
  async ready() {}

  /**
   * Called during graceful shutdown
   */
  async shutdown() {}
}
```

The provider receives the `ApplicationService` through its constructor, giving you access to the IoC container and other application services. All lifecycle methods are optional—you only implement the hooks you need.

### Registering a container binding

Let's register a simple Cache class into the container using the `register` method. For this example, we'll create a minimal Cache class in the same file, though in a real-world package this class would typically live elsewhere.
```ts
// title: providers/cache_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * A simple Cache service.
 * In real-world packages, this would be in a separate
 * file like src/cache.ts
 */
class Cache {
  get(key: string) {
    // Implementation would go here
    return null
  }
  
  set(key: string, value: any) {
    // Implementation would go here
  }
}

export default class CacheProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind('cache', () => {
      return new Cache()
    })
  }
}
```

### Using your registered service

Once registered, you can inject the Cache service into controllers or other container-managed classes:
```ts
// title: app/controllers/posts_controller.ts
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  @inject()
  constructor(protected cache: any) {}

  async index({ response }: HttpContext) {
    const cachedPosts = this.cache.get('posts')
    
    if (cachedPosts) {
      return response.json(cachedPosts)
    }

    // Fetch from database and cache...
    return response.json([])
  }
}
```

### What you learned

You now know how to:
- Generate a service provider using the `make:provider` command
- Register container bindings in the `register` method
- Inject registered services into controllers using the `@inject` decorator
- Understand the basic structure of a service provider

## Common mistakes when creating service providers

When working with service providers, developers sometimes encounter issues that can be avoided with proper understanding.

### Performing async operations in the register method

:::tip
The `register` method is synchronous by design. Performing async operations without proper handling can cause race conditions where your binding isn't ready when other code tries to use it.
:::

Developers often try to fetch a binding from the container and use it as a dependency for their own binding. Instead, perform async work inside the callback functions you pass to `container.bind()` or `container.singleton()`. The container calls these callbacks lazily when someone actually requests the binding.
```ts
// ❌ Wrong: Async work in register method
register() {
  const something = await this.app.container.make('someService')
  this.app.container.bind('myService', () => {
    return new MyService(something)
  })
}

// ✅ Correct: Async work inside the binding callback
register() {
  this.app.container.bind('myService', async () => {
    const something = await this.app.container.make('someService')
    return new MyService(something)
  })
}
```

### Registering providers for the wrong environment

:::warning
A WebSocket server provider that runs during CLI commands will attempt to start a WebSocket server every time you run an Ace command, causing unnecessary initialization and potential errors.
:::

Use environment restrictions in your `adonisrc.ts` configuration to specify exactly when a provider should run. Web-specific services like WebSockets or HTTP middleware should use `['web']`. Development tools and debugging utilities might use `['web', 'console']`. Test-specific setup belongs in `['test']`.
```ts
// title: adonisrc.ts
export default defineConfig({
  providers: [
    // ❌ Wrong: WebSocket provider runs everywhere, including CLI
    () => import('./providers/websocket_provider.js'),
    
    // ✅ Correct: WebSocket provider only runs in web environment
    {
      file: () => import('./providers/websocket_provider.js'),
      environment: ['web'],
    },
  ],
})
```

## Advanced: Understanding all lifecycle hooks

Service providers offer five lifecycle hooks that run at different stages of your application's lifetime. Understanding when each hook runs and what it's designed for helps you build robust applications and packages.

### The register hook (synchronous)

The `register` method is called as soon as AdonisJS imports your provider, very early in the boot process before any other hooks run. Its primary purpose is to register bindings into the IoC container.
```ts
// title: providers/database_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class DatabaseProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('database', () => {
      return new Database(this.app.config.get('database'))
    })
  }
}
```

The `register` hook is synchronous and must remain synchronous. Use it exclusively for registering container bindings. Don't attempt to resolve bindings, perform I/O operations, or access framework services that might not be ready yet.

### The boot hook (asynchronous)

The `boot` method runs after all providers have finished registering their bindings. At this point, the container is fully populated and you can safely resolve any binding. This makes `boot` the natural place to extend framework classes or configure services that depend on other registered bindings.
```ts
// title: providers/response_extension_provider.ts
import { Response } from '@adonisjs/core/http'
import type { ApplicationService } from '@adonisjs/core/types'

export default class ResponseExtensionProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    Response.macro('apiSuccess', function (data: any) {
      return this.json({
        success: true,
        data,
      })
    })
  }
}
```

Use `boot` when you need to extend framework classes with macros, configure validators with custom rules, register Edge template helpers, or set up any service that depends on other container bindings being available.

### The start hook (asynchronous)

The `start` method runs just before the HTTP server starts (in the web environment) or before an Ace command executes (in the console environment). Preload files are imported after this hook completes, making it ideal for actions that must happen before your application handles requests.
```ts
// title: providers/routes_provider.ts
import router from '@adonisjs/core/services/router'
import type { ApplicationService } from '@adonisjs/core/types'

export default class RoutesProvider {
  constructor(protected app: ApplicationService) {}

  async start() {
    /**
     * Load routes from database or external configuration
     */
    const dynamicRoutes = await this.loadRoutesFromDatabase()
    
    dynamicRoutes.forEach((route) => {
      router.get(route.path, route.handler)
    })
  }

  private async loadRoutesFromDatabase() {
    // Implementation would fetch routes from database
    return []
  }
}
```

Use `start` for operations that must complete before your application becomes active, such as registering routes, warming up caches, or performing health checks on external services.

### The ready hook (asynchronous)

The `ready` method runs after the HTTP server has started accepting connections (in the web environment) or just before executing an Ace command's `run` method (in the console environment). This is your last opportunity to perform setup that requires a fully initialized application.
```ts
// title: providers/websocket_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'
import { Server } from 'socket.io'

export default class WebSocketProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const httpServer = await this.app.container.make('server')
      
      const io = new Server(httpServer, {
        cors: {
          origin: '*',
        },
      })

      this.app.container.singleton('websocket', () => io)

      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id)
      })
    }
  }
}
```

Use `ready` to integrate services that must attach to the running HTTP server, such as WebSocket servers, or to perform post-startup tasks like sending notifications that the application is online.

### The shutdown hook (asynchronous)

The `shutdown` method runs when AdonisJS receives a signal to terminate gracefully. This is your opportunity to clean up resources, close connections, and ensure your application shuts down without losing data or leaving dangling processes.
```ts
// title: providers/database_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class DatabaseProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('database', () => {
      return new Database(this.app.config.get('database'))
    })
  }

  async shutdown() {
    const database = await this.app.container.make('database')
    await database.closeAllConnections()
    console.log('Database connections closed')
  }
}
```

Use `shutdown` to close database connection pools, flush pending log writes, disconnect from Redis, close file handles, or perform any other cleanup necessary for graceful termination. The framework waits for all `shutdown` hooks to complete before exiting.

## See also

- [Dependency Injection and IoC Container](../concepts/dependency_injection.md) - Learn how the container resolves and manages dependencies
- [Application Lifecycle](../concepts/application_lifecycle.md) - Understand the complete application boot and shutdown process
- [Container Bindings](../fundamentals/container_bindings.md) - Deep dive into binding services to the IoC container
- [Extending the Framework with Macros](../fundamentals/extending_the_framework.md) - Learn how to extend AdonisJS classes with custom functionality