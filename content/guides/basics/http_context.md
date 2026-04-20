---
description: Learn about the HTTP context object in AdonisJS and how to access request-specific data and services.
---

# HTTP Context

This guide covers the HTTP context object in AdonisJS. You will learn:

- What the HTTP context is and why it exists
- How to access it in route handlers and middleware
- What properties the HTTP context exposes and when each is available
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
  const id = params.id
  const include = request.qs().include

  return response.json({ id, include })
})
```

When using controllers, the pattern is identical. The controller method receives the HTTP context as its first parameter:

```ts title="app/controllers/posts_controller.ts"
import { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'

export default class PostsController {
  async show({ params, response }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    return response.json(post)
  }
}
```

### In middleware

Middleware functions also receive the HTTP context as their first parameter. The second parameter is the `next` function that passes control to the next middleware in the chain. The logger used below is already request-scoped, so every log line is automatically tagged with the current request id.

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

## Available properties

The HTTP context bundles together everything you need to handle a request: the incoming data, the response you are building, logging, authentication, and more. The properties on it come from three sources: the core framework, optional packages you install, and middleware or providers that live inside your project.

### Always available

These properties are attached to every HTTP context instance by the framework itself.

::::options

:::option{name="request" dataType="HttpRequest"}
The [`HttpRequest`](https://github.com/adonisjs/http-server/blob/-/src/request.ts) instance exposes the incoming request data: the query string, the request body, headers, cookies, uploaded files, the client IP, the hostname, and the HTTP method. Use it whenever you need to read something the client sent.

```ts
const page = ctx.request.input('page', 1)
const agent = ctx.request.header('user-agent')
```
:::

:::option{name="response" dataType="HttpResponse"}
The [`HttpResponse`](https://github.com/adonisjs/http-server/blob/-/src/response.ts) instance is used to build and send the response. It provides methods to set the status code, headers, and cookies, to send JSON, HTML, files, or rendered views, to redirect the client, to stream content, and to abort the request early.

```ts
return ctx.response.status(201).json({ id: post.id })
```
:::

:::option{name="params" dataType="Record<string, any>"}
A plain object holding the route parameters parsed from the URL. For a route defined as `/posts/:id/comments/:commentId`, a request to `/posts/1/comments/42` makes `params` equal to `{ id: '1', commentId: '42' }`. Parameter values are always strings. Cast them inside your handler if you need another type.
:::

:::option{name="route" dataType="Route | undefined"}
A reference to the [route](https://github.com/adonisjs/http-server/blob/-/src/types/route.ts#L149) definition that matched the current request, including the pattern, the HTTP methods, the registered middleware stack, and the handler. This is `undefined` for requests that did not match any route, which typically only happens inside the exception handler.
:::

:::option{name="logger" dataType="Logger"}
A request-scoped [`Logger`](https://github.com/adonisjs/logger/blob/-/src/logger.ts) instance. Log lines written through `ctx.logger` are automatically tagged with a unique request id, which makes it straightforward to trace all output belonging to a single request across your application.

```ts
ctx.logger.info({ postId: id }, 'Loading post')
```
:::

::::

### Available with optional packages

These properties are contributed by optional packages. They only exist on the context when the corresponding package is installed and its middleware (where applicable) is registered.

::::options

:::option{name="session" dataType="Session"}
A [`Session`](https://github.com/adonisjs/session/blob/-/src/session.ts) instance for reading and writing session data, including flash messages, for the current request. Available when `@adonisjs/session` is installed and the session middleware is registered.
:::

:::option{name="auth" dataType="Authenticator"}
An [`Authenticator`](https://github.com/adonisjs/auth/blob/-/src/authenticator.ts) instance used to authenticate the request and access the currently logged-in user. Available when `@adonisjs/auth` is installed and the auth middleware is registered.
:::

:::option{name="view" dataType="EdgeRenderer"}
An [Edge](https://github.com/edge-js/edge/blob/-/src/edge/renderer.ts) renderer scoped to the current request, used to render server-side templates. Available when `edge.js` is installed and registered via the view provider.
:::

:::option{name="inertia" dataType="Inertia"}
An [`Inertia`](https://github.com/adonisjs/inertia/blob/-/src/inertia.ts) instance used to render React or Vue pages through Inertia.js. Available when `@adonisjs/inertia` is installed and the Inertia middleware is registered.
:::

:::option{name="bouncer" dataType="Bouncer"}
A [`Bouncer`](https://github.com/adonisjs/bouncer/blob/-/src/bouncer.ts) instance used to authorize actions against the authenticated user through Bouncer abilities and policies. Available when `@adonisjs/bouncer` is installed.
:::

:::option{name="i18n" dataType="I18n"}
An [`I18n`](https://github.com/adonisjs/i18n/blob/-/src/i18n.ts) instance scoped to the request's detected language, used to translate messages and format dates, numbers, and currencies. Available when `@adonisjs/i18n` is installed and the i18n middleware is registered.
:::

::::

### Added by project scaffolding

These properties are attached by middleware or providers that live inside your project rather than being provided by the framework or an installed package. Their availability depends on which files your project scaffolding includes, so they stay with your project even as framework and package versions change.

::::options

:::option{name="containerResolver" dataType="ContainerResolver"}
A request-scoped IoC container resolver, attached to the context by the `container_bindings_middleware` file that ships with every new AdonisJS project. Use it when you need to manually resolve classes from the container while preserving the current request scope, for example when instantiating a service that type-hints `HttpContext` in its constructor.
:::

:::option{name="serialize" dataType="ApiSerializer"}
A helper for type-safe serialization of response payloads, attached to the context by the `providers/api_provider.ts` file that ships with the Inertia and API starter kits. Projects scaffolded from other starter kits, or projects where this provider has been removed, will not have `ctx.serialize` available.
:::

::::

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
    // [!code highlight]
    const user = this.ctx.auth.user

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
    return postService.getVisiblePosts()
  }
}
```

## Using Async local storage

Async local storage (ALS) allows you to access the HTTP context from anywhere in your application without explicitly passing it through function parameters.

:::tip
Prefer dependency injection or passing `HttpContext` by reference as your default patterns. Reach for ALS only when those are not feasible, such as inside utility functions or third-party libraries that cannot be refactored to accept the context explicitly.
:::

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
    const ctx = HttpContext.getOrFail()

    ctx.logger.info({
      event: eventName,
      userId: ctx.auth.user?.id,
      ip: ctx.request.ip(),
    })
  }
}
```

Enabling async local storage introduces a small performance overhead, so leave it disabled unless you actually need `HttpContext.getOrFail()`.

:::warning
`HttpContext.getOrFail()` throws when called outside an HTTP request lifecycle. Only call it from code paths you know run during a request (route handlers, middleware, controllers, and the services they call). For code that can run outside a request, such as background jobs or CLI commands, inject or pass `HttpContext` explicitly instead.
:::

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

```ts title="tests/functional/posts.spec.ts"
import testUtils from '@adonisjs/core/services/test_utils'

const ctx = testUtils.createHttpContext()
```

:::tip
The created context instance is not attached to any route, so `ctx.route` and `ctx.params` are `undefined`. If the code under test reads them, assign them manually on the returned context before running your assertions.
:::

The `createHttpContext` method uses fake values for the underlying Node.js `req` and `res` objects by default. If you need to test with real request and response objects, you can provide them.

```ts title="tests/integration/server.spec.ts"
import { createServer } from 'node:http'
import testUtils from '@adonisjs/core/services/test_utils'

createServer((req, res) => {
  const ctx = testUtils.createHttpContext({ req, res })
})
```

If you're building a package outside of an AdonisJS application, you can use the `HttpContextFactory` class directly. The `testUtils` service is only available within AdonisJS applications, but the factory works anywhere.

```ts title="tests/package/http_context.spec.ts"
import { HttpContextFactory } from '@adonisjs/core/factories/http'

const ctx = new HttpContextFactory().create()
```
