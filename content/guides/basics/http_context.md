---
description: Learn about the HTTP context object in AdonisJS and how to access request-specific data and services.
---

# HTTP Context

This guide covers the HTTP context object in AdonisJS. You will learn:

- What the HTTP context is and why it exists
- How to access it in route handlers and middleware
- How to inject it into services using dependency injection
- How to add custom properties to the context
- How to access it via async local storage

## Overview

The **HTTP context** is a request-scoped object that holds everything you need to handle an HTTP request. It contains properties like `request`, `response`, `auth`, `logger`, `session`, and more. AdonisJS creates a fresh HTTP context instance for every incoming request and passes it to your route handlers and middleware.

Instead of using global variables or importing request/response objects from different modules, the HTTP context provides a clean, type-safe way to access all request-specific data and services in one place. Every property on the context is specifically tied to the current request, ensuring complete isolation between concurrent requests.

## Accessing HTTP context

### In route handlers

The most common way to access the HTTP context is by receiving it as a parameter in your route handlers. You typically destructure only the properties you need rather than working with the full context object.

```ts title="start/routes.ts"
import router from '@adonisjs/core/services/router'

router.get('/posts/:id', async ({ params, request, response }) => {
  /**
   * Extract the post ID from route parameters.
   * The params object is a property of HTTP context.
   */
  const id = params.id
  
  /**
   * Access request data like query strings or headers.
   * The request object is another property of HTTP context.
   */
  const include = request.qs().include
  
  /**
   * Return a JSON response using the response object.
   */
  return response.json({ id, include })
})
```

When using controllers, the pattern is identical. The controller method receives the HTTP context as its first parameter:

```ts title="app/controllers/posts_controller.ts"
import { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  async show({ params, request, response }: HttpContext) {
    /**
     * Same destructuring pattern works in controller methods.
     * You only extract what you need for this specific action.
     */
    const id = params.id
    const post = await Post.find(id)
    
    return response.json(post)
  }
}
```

### In middleware

Middleware functions also receive the HTTP context as their first parameter. The second parameter is the `next` function to call the next middleware in the chain.

```ts title="app/middleware/log_request_middleware.ts"
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

export default class LogRequestMiddleware {
  async handle({ request, logger }: HttpContext, next: NextFn) {
    /**
     * Access the logger from the context to log request details.
     * The logger is already configured and ready to use.
     */
    logger.info(`${request.method()} ${request.url()}`)
    
    /**
     * Call next() to continue the request through the middleware chain.
     */
    await next()
  }
}
```

## Available properties

The HTTP context provides access to many framework services and request-specific data. Here are the most commonly used properties:

| Property | Type | Description |
|----------|------|-------------|
| `request` | `Request` | HTTP request object for accessing request data |
| `response` | `Response` | HTTP response object for sending responses |
| `params` | `object` | Route parameters as key-value pairs |
| `logger` | `Logger` | Request-scoped logger instance |
| `session` | `Session` | Session manager (when session middleware is enabled) |
| `auth` | `Authenticator` | Authentication manager (when auth middleware is enabled) |
| `view` | `View` | Template renderer for server-side rendering |
| `route` | `Route` | The matched route for this request |

## Using dependency injection

When you need to access the HTTP context inside service classes or other parts of your codebase, you can use dependency injection. This pattern is cleaner than passing the context manually through multiple function calls.

### Injecting into services

To inject the HTTP context into a service, type-hint it in the constructor and mark the class with the `@inject()` decorator.

```ts title="app/services/post_service.ts"
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'

// [!code highlight]
@inject()
export default class PostService {
  // [!code highlight]
  constructor(protected ctx: HttpContext) {}
  
  async getVisiblePosts() {
    /**
     * Access the authenticated user from the context.
     * The context is available throughout all service methods.
     */
    // [!code highlight]
    const user = this.ctx.auth.user
    
    /**
     * Use the user's permissions to filter visible posts.
     */
    if (user?.isAdmin) {
      return Post.all()
    }
    
    return Post.query().where('published', true)
  }
}
```

### Using services in controllers

To enable automatic dependency injection, you must inject the `PostService` into the controller method. When the container calls the `index` method, it will construct the entire tree of dependencies and provide the HTTP context to the `PostService`.

```ts title="app/controllers/posts_controller.ts"
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import PostService from '#services/post_service'

export default class PostsController {
  // [!code highlight:2]
  @inject()
  async index({}: HttpContext, postService: PostService) {
    /**
     * The PostService receives the current request's HTTP context
     * automatically. You don't need to pass it manually from the
     * controller.
     */
    const posts = await postService.getVisiblePosts()
    
    return posts
  }
}
```

## Using Async local storage

Async local storage (ALS) allows you to access the HTTP context from anywhere in your application without explicitly passing it through function parameters.

We recommend using dependency injection or passing HttpContext by reference as your primary patterns. Only reach for ALS when it's extremely necessary, such as in utility functions or third-party libraries where passing context explicitly is not feasible.

To use ALS, you must first enable it inside the `config/app.ts` file under the `http` block.

```ts title="config/app.ts"
import { defineConfig } from '@adonisjs/core/http'

export const http = defineConfig({
  useAsyncLocalStorage: true
})
```

Once enabled, you can access the current HTTP context using the static `getOrFail()` method.

```ts title="app/services/analytics_service.ts"
import { HttpContext } from '@adonisjs/core/http'

export default class AnalyticsService {
  trackEvent(eventName: string) {
    /**
     * Retrieve the current request's HTTP context.
     * This works because ALS maintains the context throughout
     * the async call chain.
     */
    const ctx = HttpContext.getOrFail()
  }
}
```

Keep in mind that enabling async local storage has a slight performance overhead. The `HttpContext.getOrFail()` method will throw an error when called outside the context of an HTTP request, so it only works within the request lifecycle.

## Adding custom properties

You can add custom properties to the HTTP context by augmenting the `HttpContext` interface in your middleware file. This is useful when you need to share data across multiple middleware and route handlers during the same request.

```ts title="app/middleware/identify_tenant_middleware.ts"
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import Tenant from '#models/tenant'

/**
 * Augment the HttpContext interface to add the tenant property.
 * This makes TypeScript aware of the new property.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant: Tenant
  }
}

export default class IdentifyTenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Extract the tenant identifier from the request.
     * This could come from a subdomain, header, or other source.
     */
    const subdomain = ctx.request.hostname().split('.')[0]
    
    /**
     * Look up the tenant and attach it to the context.
     * Now all route handlers can access ctx.tenant.
     */
    ctx.tenant = await Tenant.findByOrFail('subdomain', subdomain)
    
    await next()
  }
}
```

## Creating dummy context for testing

When writing tests, you often need a dummy HTTP context instance to test route handlers, middleware, or services. Use the `testUtils` service to create these test instances.

```ts
import testUtils from '@adonisjs/core/services/test_utils'

const ctx = testUtils.createHttpContext()
```

The created context instance is not attached to any route, so `ctx.route` and `ctx.params` will be undefined. You can manually assign these properties if your code under test requires them.

The `createHttpContext` method uses fake values for the underlying Node.js `req` and `res` objects by default. If you need to test with real request and response objects, you can provide them.

```ts
import { createServer } from 'node:http'
import testUtils from '@adonisjs/core/services/test_utils'

createServer((req, res) => {
  /**
   * Pass the real Node.js req and res objects
   * to create a context with actual request data.
   */
  const ctx = testUtils.createHttpContext({
    req,
    res
  })
})
```

If you're building a package outside of an AdonisJS application, you can use the `HttpContextFactory` class directly. The `testUtils` service is only available within AdonisJS applications, but the factory works anywhere.

```ts
import { HttpContextFactory } from '@adonisjs/core/factories/http'

/**
 * Create a standalone HTTP context instance
 * without needing the full AdonisJS application.
 */
const ctx = new HttpContextFactory().create()
```
