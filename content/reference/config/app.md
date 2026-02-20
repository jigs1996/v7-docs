---
description: Complete reference for all configuration options available in the config/app.ts file for HTTP server behavior, cookies, and runtime settings.
---

# App Configuration Reference

This reference guide documents all configuration options available in the `config/app.ts` file. The app configuration controls the HTTP server behavior, cookie settings, request parsing, and various other runtime settings for your AdonisJS application.

## Overview

The `config/app.ts` file exports configuration that controls how your AdonisJS application handles HTTP requests. This includes settings for request identification, cookie management, query string parsing, and timeout configurations. The configuration is defined using the `defineConfig` helper from `@adonisjs/core/http`, which provides full TypeScript support.

Three main exports are available:
- `appKey` - Used for encrypting cookies, generating signed URLs, and by the encryption module
- `appUrl` - The canonical URL of your application, used for generating absolute URLs
- `http` - The HTTP server configuration object containing all runtime settings

## Form Method Spoofing

HTML forms only support GET and POST methods. Method spoofing allows you to specify other HTTP methods (PUT, PATCH, DELETE) via a query parameter, enabling full RESTful routing with standard HTML forms.

```ts
// title: config/app.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/core/http'

export const http = defineConfig({
  /**
   * Enable method spoofing for HTML forms.
   * This allows forms to use PUT, PATCH, and DELETE methods
   * by adding ?_method=PUT to the form action.
   */
  allowMethodSpoofing: true
})
```

With method spoofing enabled, you can use the `_method` query parameter in your forms:

```html
<!-- Form will be processed as a PUT request -->
<form method="POST" action="/posts/1?_method=PUT">
  <input type="text" name="title" />
  <button type="submit">Update Post</button>
</form>

<!-- Form will be processed as a DELETE request -->
<form method="POST" action="/posts/1?_method=DELETE">
  <button type="submit">Delete Post</button>
</form>
```

Method spoofing is disabled by default for security reasons. Only enable it when you need to support traditional HTML forms that require non-GET/POST methods.

## Async Local Storage

Async local storage allows you to access the HTTP context from anywhere in your application without explicitly passing it through function parameters. This is useful for accessing the current request context in utility functions, service classes, or deeply nested code.

```ts
// title: config/app.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/core/http'

export const http = defineConfig({
  /**
   * Enable async local storage to access HTTP context globally.
   * Once enabled, you can use HttpContext.getOrFail() from anywhere.
   */
  useAsyncLocalStorage: true
})
```

With async local storage enabled, you can access the HTTP context without passing it explicitly:

```ts
// title: app/services/audit_logger.ts
import { HttpContext } from '@adonisjs/core/http'

export class AuditLogger {
  log(action: string) {
    /**
     * Access the current request context without it being passed
     * as a parameter. This works because async local storage
     * maintains the context across async operations.
     */
    const ctx = HttpContext.getOrFail()
    
    console.log({
      action,
      userId: ctx.auth.user?.id,
      ip: ctx.request.ip(),
      url: ctx.request.url()
    })
  }
}
```
