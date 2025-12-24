# Service Providers

> Service providers are JavaScript classes with lifecycle hooks that execute during application startup and shutdown. Used to register IoC container bindings, extend framework classes, and manage application lifecycle.

## Key Concepts

- **Purpose**: Centralized initialization logic at predictable lifecycle points
- **Location**: Registered in `adonisrc.ts` file
- **Lazy loading**: Providers use `() => import()` syntax
- **Environment filtering**: Control which environments providers run in

## Registration

```ts
// adonisrc.ts
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

## Execution Order

1. `register` - All providers in order
2. `boot` - All providers in order
3. `start` - All providers in order
4. `ready` - All providers in order
5. `shutdown` - During termination

## Lifecycle Hooks

### register (sync)
- Runs immediately on provider import
- Register IoC container bindings
- No I/O or binding resolution
- Must be synchronous

```ts
register() {
  this.app.container.singleton('database', () => {
    return new Database(this.app.config.get('database'))
  })
}
```

### boot (async)
- Runs after all providers registered
- Safe to resolve bindings
- Extend framework classes
- Configure services

```ts
async boot() {
  Response.macro('apiSuccess', function (data: any) {
    return this.json({ success: true, data })
  })
}
```

### start (async)
- Before HTTP server starts or command runs
- Preload files imported after this
- Register routes
- Warm caches

```ts
async start() {
  const dynamicRoutes = await this.loadRoutesFromDatabase()
  dynamicRoutes.forEach((route) => {
    router.get(route.path, route.handler)
  })
}
```

### ready (async)
- After HTTP server ready or before command runs
- Attach to running server (WebSockets)
- Post-startup tasks

```ts
async ready() {
  if (this.app.getEnvironment() === 'web') {
    const httpServer = await this.app.container.make('server')
    const io = new Server(httpServer)
    this.app.container.singleton('websocket', () => io)
  }
}
```

### shutdown (async)
- During graceful termination
- Close connections
- Cleanup resources
- Framework waits for completion

```ts
async shutdown() {
  const database = await this.app.container.make('database')
  await database.closeAllConnections()
}
```

## Creating a Provider

Generate:
```bash
node ace make:provider cache
```

Basic structure:
```ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class CacheProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(Cache, () => new Cache())
  }
}
```

Inject in controllers:
```ts
export default class PostsController {
  @inject()
  constructor(protected cache: Cache) {}

  async index({ response }: HttpContext) {
    const cachedPosts = this.cache.get('posts')
    return response.json(cachedPosts || [])
  }
}
```

## When to Use

**Create service provider for:**
- Register services into IoC container
- Extend framework classes with macros
- Initialization at specific lifecycle points
- Resources requiring shutdown cleanup
- Application-wide third-party package configuration

**Don't use for:**
- Simple utility functions
- One-off setup in single location
- Single controller/middleware services

## Built-in Providers

- **app_provider**: Fundamental application services and helpers
- **hash_provider**: Password hashing and verification
- **repl_provider**: REPL-specific bindings (repl/test environments only)
- **http_provider**: HTTP server and web request services
