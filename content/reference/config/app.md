# App Configuration Reference

This reference guide documents all configuration options available in the `config/app.ts` file. The app configuration controls the HTTP server behavior, cookie settings, request parsing, and various other runtime settings for your AdonisJS application.

## Overview

The `config/app.ts` file exports configuration that controls how your AdonisJS application handles HTTP requests. This includes settings for request identification, cookie management, query string parsing, and timeout configurations. The configuration is defined using the `defineConfig` helper from `@adonisjs/core/http`, which provides full TypeScript support.

Three main exports are available:
- `appKey` - Used for encrypting cookies, generating signed URLs, and by the encryption module
- `appUrl` - The canonical URL of your application, used for generating absolute URLs
- `http` - The HTTP server configuration object containing all runtime settings

## Custom IP Address Extraction

By default, AdonisJS extracts the client IP address from the request using standard methods. However, when running behind proxies or CDNs like Cloudflare, you may need to extract the IP from custom headers.
```ts
// title: config/app.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/core/http'
import type { IncomingMessage } from 'node:http'

export const http = defineConfig({
  /**
   * Extract IP from Cloudflare's CF-Connecting-IP header
   * Falls back to standard IP extraction if header is not present
   */
  getIp(request: IncomingMessage) {
    const cloudflareIp = request.headers['cf-connecting-ip']
    
    if (cloudflareIp && typeof cloudflareIp === 'string') {
      return cloudflareIp
    }
    
    // Return undefined to fall back to default IP extraction
    return undefined
  }
})
```

The `getIp` method receives the Node.js `IncomingMessage` object and must return a string IP address or `undefined` to fall back to default behavior. This is useful when working with CDNs that provide the real client IP in custom headers.

## Trusting Proxy Servers

When your application runs behind a reverse proxy (like Nginx) or load balancer, you need to configure which proxy IP addresses to trust. This allows AdonisJS to correctly read the `X-Forwarded-*` headers that proxies add to requests.
```ts
// title: config/app.ts
import env from '#start/env'
import { defineConfig } from '@adonisjs/core/http'
import proxyAddr from 'proxy-addr'

export const http = defineConfig({
  /**
   * Trust the loopback address and private IP ranges.
   * This is safe for most deployment scenarios where your
   * proxy runs on the same machine or private network.
   */
  trustProxy: proxyAddr.compile(['loopback', 'uniquelocal'])
})
```

The `trustProxy` option accepts any value supported by the [proxy-addr](https://www.npmjs.com/package/proxy-addr) package. Common configurations include:
```ts
// Trust all proxies (not recommended for production)
trustProxy: () => true

// Trust specific IP addresses
trustProxy: proxyAddr.compile(['127.0.0.1', '192.168.1.1'])

// Trust IP ranges using CIDR notation
trustProxy: proxyAddr.compile('10.0.0.0/8')
```

:::warning

**Why this matters**: Incorrectly configuring `trustProxy` can lead to security vulnerabilities where attackers spoof IP addresses via forged headers.

**What happens if misconfigured**: Your application may trust malicious `X-Forwarded-*` headers from untrusted sources, allowing IP spoofing attacks that could bypass rate limiting, geolocation restrictions, or security rules.

**The solution**: Only trust proxy servers you control. Never use `() => true` in production unless your application is completely isolated behind trusted infrastructure. Consult the [proxy-addr documentation](https://www.npmjs.com/package/proxy-addr) for detailed configuration options.

:::

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

:::warning

**Why this matters**: Async local storage uses Node.js's `AsyncLocalStorage` API, which has a small performance overhead and can cause issues in certain edge cases.

**What happens if enabled**: You gain convenient access to the HTTP context from anywhere, but your application will consume slightly more memory and CPU resources per request.

**The solution**: Only enable this feature if you genuinely need global context access. For most applications, explicitly passing the HTTP context through function parameters is the preferred approach as it maintains clear data flow and better performance.

:::

## Configuration Reference

### Top-Level Exports

| Export | Type | Description |
|--------|------|-------------|
| `appKey` | `string` | Encryption key used for cookies, signed URLs, and the encryption module. Read from `APP_KEY` environment variable. |
| `appUrl` | `string` | Canonical URL of your application. Used for generating absolute URLs in emails, RSS feeds, and other contexts. Read from `APP_URL` environment variable. |
| `http` | `object` | HTTP server configuration object. See detailed options below. |

:::warning

**Critical: APP_KEY Security**

**Why this matters**: The `appKey` is used to encrypt session data, cookies, and other sensitive information. If the key is lost or changed, all existing encrypted data becomes unreadable.

**What happens if changed**: Users will be logged out as their sessions become invalid. Any encrypted data in your database cannot be decrypted. Signed URLs will fail verification.

**The solution**: Store your `APP_KEY` securely in your environment configuration and never commit it to version control. Generate it once using `node ace generate:key` and keep it consistent across all environments. Back it up securely along with your other production secrets.

:::

### HTTP Configuration Options

All options below are properties of the `http` object returned by `defineConfig()`.

#### Request Handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `generateRequestId` | `boolean` | `true` | Automatically generate a unique request ID if the `x-request-id` header is not present. The generated ID is accessible via `request.id()`. |
| `createRequestId` | `() => string` | `uuid.v4` | Custom function to generate request IDs. Must return a unique string identifier. Only called when `generateRequestId` is true and no `x-request-id` header exists. |
| `getIp` | `(request: IncomingMessage) => string \| undefined` | `undefined` | Custom function to extract the client IP address. Receives the Node.js request object. Return `undefined` to fall back to default IP extraction. Useful for reading IP from CDN headers like Cloudflare's `cf-connecting-ip`. |
| `allowMethodSpoofing` | `boolean` | `false` | Enable HTTP method spoofing via the `_method` query parameter. When enabled, HTML forms can specify PUT, PATCH, or DELETE methods by adding `?_method=PUT` to the form action URL. |
| `useAsyncLocalStorage` | `boolean` | `false` | Enable async local storage for accessing HTTP context globally via `HttpContext.getOrFail()`. Has a small performance overhead. |

#### Subdomain Handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `subdomainOffset` | `number` | `2` | Number of dot-separated parts of the host to remove to access the subdomain. With the default value of 2, the domain `api.example.com` yields a subdomain of `api`. For `localhost` or IP addresses, the subdomain is always empty. |

#### Proxy Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trustProxy` | `Function \| boolean \| string \| string[]` | `undefined` | Configures which proxy IP addresses to trust when reading `X-Forwarded-*` headers. Accepts any value supported by the [proxy-addr](https://www.npmjs.com/package/proxy-addr) package. Critical for security when running behind proxies or load balancers. |

#### Cookie Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookie.domain` | `string` | `''` | Domain for which the cookie is valid. An empty string means the cookie is valid for the current domain only. Use `.example.com` to make cookies valid across all subdomains. |
| `cookie.path` | `string` | `'/'` | URL path prefix for which the cookie is valid. The default `/` makes cookies available to all routes. |
| `cookie.maxAge` | `number \| string` | `7200` | Cookie lifetime in seconds (as number) or as a time expression string (e.g., `'2h'`, `'7d'`). After this duration, the browser will delete the cookie. |
| `cookie.expires` | `Date \| (() => Date)` | `undefined` | Absolute expiration date for the cookie. If provided as a function, it's called when setting the cookie. Prefer `maxAge` over `expires` for relative expiration times. |
| `cookie.httpOnly` | `boolean` | `true` | Prevents JavaScript from accessing the cookie via `document.cookie`. Should remain `true` for security unless you specifically need client-side cookie access. |
| `cookie.secure` | `boolean` | `false` | Only send the cookie over HTTPS connections. Should be `true` in production to prevent cookie interception. |
| `cookie.sameSite` | `boolean \| 'lax' \| 'none' \| 'strict'` | `'lax'` | Controls cross-site cookie sending behavior. `'strict'` prevents all cross-site sending, `'lax'` allows top-level navigation, `'none'` allows all cross-site requests (requires `secure: true`). |
| `cookie.partitioned` | `boolean` | `undefined` | Enable cookie partitioning for third-party contexts. Part of the Privacy Sandbox initiative. See [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Privacy_sandbox/Partitioned_cookies) for browser support and usage. |
| `cookie.priority` | `'low' \| 'medium' \| 'high'` | `undefined` | Cookie priority hint for the browser. Non-standard attribute with limited browser support. |

#### Query String Parsing

The `qs` object configures how query strings are parsed and stringified. AdonisJS uses the [qs](https://www.npmjs.com/package/qs) package internally. Consult the qs documentation for detailed explanations of these options.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `qs.parse.depth` | `number` | `5` | Maximum depth for parsing nested objects in query strings. |
| `qs.parse.parameterLimit` | `number` | `1000` | Maximum number of query string parameters to parse. Prevents abuse via extremely long query strings. |
| `qs.parse.allowSparse` | `boolean` | `false` | Whether to allow sparse arrays (arrays with empty slots) in parsed results. |
| `qs.parse.arrayLimit` | `number` | `20` | Maximum array length when parsing array parameters. |
| `qs.parse.comma` | `boolean` | `true` | Parse comma-separated values as arrays. For example, `?ids=1,2,3` becomes `{ ids: ['1', '2', '3'] }`. |
| `qs.stringify.encode` | `boolean` | `true` | Whether to URL-encode values when stringifying objects to query strings. |
| `qs.stringify.encodeValuesOnly` | `boolean` | `false` | Only encode values, not keys. Useful when keys are already URL-safe. |
| `qs.stringify.arrayFormat` | `'indices' \| 'brackets' \| 'repeat' \| 'comma'` | `'indices'` | Format for stringifying arrays. `'indices'`: `a[0]=1&a[1]=2`, `'brackets'`: `a[]=1&a[]=2`, `'repeat'`: `a=1&a=2`, `'comma'`: `a=1,2`. |
| `qs.stringify.skipNulls` | `boolean` | `false` | Skip null values when stringifying objects to query strings. |

#### Server Timeouts

These options are passed directly to the Node.js HTTP server. Consult the [Node.js http.Server documentation](https://nodejs.org/api/http.html#class-httpserver) for detailed explanations.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `keepAliveTimeout` | `number` | `undefined` | Milliseconds of inactivity before a keep-alive connection is closed. |
| `headersTimeout` | `number` | `undefined` | Milliseconds to wait for complete HTTP headers. Should be larger than `keepAliveTimeout`. |
| `requestTimeout` | `number` | `undefined` | Milliseconds to wait for the entire request (headers + body) to be received. |
| `timeout` | `number` | `undefined` | Milliseconds of inactivity before a socket is presumed to have timed out. |

## Complete Example

Here's a production-ready configuration example incorporating common patterns:
```ts
// title: config/app.ts
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'
import proxyAddr from 'proxy-addr'

export const appKey = env.get('APP_KEY')
export const appUrl = env.get('APP_URL')

export const http = defineConfig({
  /**
   * Generate request IDs for tracking requests through logs
   */
  generateRequestId: true,
  
  /**
   * Enable method spoofing for HTML forms
   */
  allowMethodSpoofing: true,
  
  /**
   * Trust proxies in the private network range
   * Adjust this based on your infrastructure
   */
  trustProxy: proxyAddr.compile(['loopback', 'uniquelocal']),
  
  /**
   * Extract IP from Cloudflare headers when available
   */
  getIp(request) {
    const cfIp = request.headers['cf-connecting-ip']
    if (cfIp && typeof cfIp === 'string') {
      return cfIp
    }
  },
  
  /**
   * Secure cookie configuration for production
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
  
  /**
   * Conservative query string parsing limits
   */
  qs: {
    parse: {
      depth: 5,
      parameterLimit: 1000,
    }
  },
  
  /**
   * Reasonable timeouts for production traffic
   */
  keepAliveTimeout: 5000,
  headersTimeout: 60000,
  requestTimeout: 60000,
})
```