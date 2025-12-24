---
summary: HTTP context object in AdonisJS - request-scoped data and services access.
---

# HTTP Context

## What is HTTP Context

- Request-scoped object holding all request-specific data and services
- Contains: `request`, `response`, `auth`, `logger`, `session`, etc.
- Fresh instance created per incoming request
- Type-safe access to request data
- Ensures isolation between concurrent requests

## Access Patterns

### Route Handlers

Destructure needed properties from context parameter:

```ts title="start/routes.ts"
import router from '@adonisjs/core/services/router'

router.get('/posts/:id', async ({ params, request, response }) => {
  const id = params.id
  const include = request.qs().include
  return response.json({ id, include })
})
```

### Controllers

Context as first parameter in methods:

```ts title="app/controllers/posts_controller.ts"
import { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async show({ params, request, response }: HttpContext) {
    const id = params.id
    const post = await Post.find(id)
    return response.json(post)
  }
}
```

### Middleware

Context + `next` function:

```ts title="app/middleware/log_request_middleware.ts"
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

export default class LogRequestMiddleware {
  async handle({ request, logger }: HttpContext, next: NextFn) {
    logger.info(`${request.method()} ${request.url()}`)
    await next()
  }
}
```

## Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `request` | `Request` | HTTP request object |
| `response` | `Response` | HTTP response object |
| `params` | `object` | Route parameters |
| `logger` | `Logger` | Request-scoped logger |
| `session` | `Session` | Session manager (requires middleware) |
| `auth` | `Authenticator` | Authentication manager (requires middleware) |
| `view` | `View` | Template renderer |
| `route` | `Route` | Matched route |

## Dependency Injection

### Inject into Services

Use `@inject()` decorator + type-hint in constructor:

```ts title="app/services/post_service.ts"
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'

@inject()
export default class PostService {
  constructor(protected ctx: HttpContext) {}

  async getVisiblePosts() {
    const user = this.ctx.auth.user
    if (user?.isAdmin) {
      return Post.all()
    }
    return Post.query().where('published', true)
  }
}
```

### Use Services in Controllers

Inject service into controller method:

```ts title="app/controllers/posts_controller.ts"
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import PostService from '#services/post_service'

export default class PostsController {
  @inject()
  async index({}: HttpContext, postService: PostService) {
    const posts = await postService.getVisiblePosts()
    return posts
  }
}
```

## Async Local Storage (ALS)

**Recommendation**: Use dependency injection or explicit passing as primary patterns. Use ALS only when necessary (utility functions, third-party libraries).

### Enable ALS

```ts title="config/app.ts"
import { defineConfig } from '@adonisjs/core/http'

export const http = defineConfig({
  useAsyncLocalStorage: true
})
```

### Access Context via ALS

```ts title="app/services/analytics_service.ts"
import { HttpContext } from '@adonisjs/core/http'

export default class AnalyticsService {
  trackEvent(eventName: string) {
    const ctx = HttpContext.getOrFail()
  }
}
```

**Notes**:
- Slight performance overhead
- `getOrFail()` throws error outside HTTP request lifecycle
- Only works within request context

## Custom Properties

Augment `HttpContext` interface:

```ts title="app/middleware/identify_tenant_middleware.ts"
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import Tenant from '#models/tenant'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant: Tenant
  }
}

export default class IdentifyTenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const subdomain = ctx.request.hostname().split('.')[0]
    ctx.tenant = await Tenant.findByOrFail('subdomain', subdomain)
    await next()
  }
}
```

## Testing

### Create Dummy Context

```ts
import testUtils from '@adonisjs/core/services/test_utils'

const ctx = testUtils.createHttpContext()
```

Notes:
- `ctx.route` and `ctx.params` undefined by default (manually assign if needed)
- Uses fake Node.js `req` and `res` objects

### With Real Request/Response

```ts
import { createServer } from 'node:http'
import testUtils from '@adonisjs/core/services/test_utils'

createServer((req, res) => {
  const ctx = testUtils.createHttpContext({ req, res })
})
```

### Outside AdonisJS Apps

```ts
import { HttpContextFactory } from '@adonisjs/core/factories/http'

const ctx = new HttpContextFactory().create()
```
