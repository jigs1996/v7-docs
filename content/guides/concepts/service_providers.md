# Service Providers

This guide covers service providers in AdonisJS applications. You will learn how to:

- Use lifecycle hooks to execute code at specific points during application startup and shutdown
- Create custom service providers
- Register bindings into the IoC container

## Overview

Service providers are JavaScript classes with lifecycle hooks that execute at specific points during application startup and shutdown. This allows you to register bindings to the IoC container, extend framework classes using Macros, perform initialization at precise moments, and clean up resources during graceful shutdown.

The key advantage is centralized initialization logic that runs at predictable times, without modifying core framework code or scattering setup code throughout your application. Every AdonisJS application and package uses service providers to hook into the application lifecycle, making them fundamental to understanding the framework.


## Understanding service providers

Before creating your own service providers, it's helpful to understand how they work within an AdonisJS application.

### Where service providers are registered

Service providers are registered in the `adonisrc.ts` file at the root of your project. This file defines which providers should load and in which runtime environments they should execute.

```ts title="adonisrc.ts"
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

Providers use lazy imports with the `() => import()` syntax, ensuring they're only loaded when needed.

### Built-in service providers

A typical AdonisJS application includes several framework providers that handle core functionality.

- **app_provider** - Registers fundamental application services and helpers that every AdonisJS app needs.

- **hash_provider** - Registers the hash service used for password hashing and verification.

- **repl_provider** - Adds REPL-specific bindings. Notice it only runs in the `repl` and `test` environments, demonstrating environment restrictions.

- **http_provider** - Sets up the HTTP server and related services for handling web requests.

When you install additional packages like `@adonisjs/lucid` for database access or `@adonisjs/auth` for authentication, these packages include their own service providers that you add to this array.

### Execution order and environments

AdonisJS calls lifecycle hooks in phases across all registered providers. First, the `register` hook runs for all providers in the order they are registered. Then the `boot` hook runs for all providers in the order they are registered, followed by `start`, `ready`, and finally `shutdown`.

Environment restrictions determine whether a provider runs at all. For instance, a WebSocket provider configured for the `web` environment won't execute when you run console commands.

This combination of execution order and environment filtering gives you precise control over what runs and when.

## When to create a service provider

Create a custom service provider when you need to register services into the IoC container, extend framework classes with macros, perform initialization at specific lifecycle points, set up resources that require cleanup during shutdown, or configure third-party packages application-wide.

You typically don't need a service provider for simple utility functions, one-off setup that only runs in a single place, or services used within a single controller or middleware. In these cases, use regular modules or inject dependencies directly.

## Creating a custom service provider

Now that you understand when service providers are appropriate, let's build one that registers a `Cache` service into the IoC container.

::::steps
:::step{title="Generate the provider"}

AdonisJS includes a command to generate service provider files.

```bash
node ace make:provider cache
```
```bash
# Output:
# CREATE: providers/cache_provider.ts
```

This command creates the provider file and automatically registers it in your `adonisrc.ts` file.

:::

:::step{title="Understand the generated code"}

Open the generated `providers/cache_provider.ts` file. You'll see a basic provider structure.

```ts title="providers/cache_provider.ts"
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

The provider receives the `ApplicationService` through its constructor, giving you access to the IoC container and other application services. All lifecycle methods are optional. You only implement the hooks you need.

:::

:::step{title="Register a container binding"}

Let's register a simple Cache class into the container using the `register` method. For this example, we'll create a minimal Cache class in the same file, though in a real-world package this class would typically live elsewhere.

```ts title="providers/cache_provider.ts"
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * A simple Cache service.
 * In real-world packages, this would be in a separate
 * file like src/cache.ts
 */
export class Cache {
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
    this.app.container.bind(Cache, () => {
      return new Cache()
    })
  }
}
```

:::

:::step{title="Use your registered service"}

Once registered, you can inject the Cache service into controllers or other container-managed classes.

```ts title="app/controllers/posts_controller.ts"
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  @inject()
  constructor(protected cache: Cache) {}

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

:::
::::

## Understanding all lifecycle hooks

Service providers offer five lifecycle hooks that run at different stages of your application's lifetime. Here's when each hook executes:

| Hook | Type | When It Runs | Common Use Cases |
|------|------|-------------|------------------|
| `register` | Sync | Immediately on provider import | Register IoC container bindings |
| `boot` | Async | After all providers registered | Extend framework classes, configure services |
| `start` | Async | Before HTTP server starts / command runs | Register routes, warm caches |
| `ready` | Async | After HTTP server ready / before command runs | Attach to running server (WebSockets) |
| `shutdown` | Async | During graceful termination | Close connections, cleanup resources |

### The register hook

The `register` method is called as soon as AdonisJS imports your provider, very early in the boot process before any other hooks run. Its primary purpose is to register bindings into the IoC container.

```ts title="providers/database_provider.ts"
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

The `register` hook is synchronous and must remain synchronous. Don't attempt to resolve bindings, perform I/O operations, or access framework services that might not be ready yet.

### The boot hook

The `boot` method runs after all providers have finished registering their bindings. At this point, the container is fully populated and you can safely resolve any binding. This makes `boot` the natural place to extend framework classes or configure services that depend on other registered bindings.

```ts title="providers/response_extension_provider.ts"
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

Use `boot` to configure validators with custom rules, register Edge template helpers, or set up any service that depends on other container bindings being available.

### The start hook

The `start` method runs just before the HTTP server starts (in the web environment) or before an Ace command executes (in the console environment). Preload files are imported after this hook completes.

```ts title="providers/routes_provider.ts"
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

Use `start` to register routes, warm caches, or perform health checks on external services.

### The ready hook

The `ready` method runs after the HTTP server has started accepting connections (in the web environment) or just before executing an Ace command's `run` method (in the console environment). This is your last opportunity to perform setup that requires a fully initialized application.

```ts title="providers/websocket_provider.ts"
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

### The shutdown hook

The `shutdown` method runs when AdonisJS receives a signal to terminate gracefully. This is your opportunity to clean up resources, close connections, and ensure your application shuts down without losing data or leaving dangling processes.

```ts title="providers/database_provider.ts"
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
