---
description: Learn how to create a custom authentication guard for AdonisJS.
---

# Creating a custom auth guard

This guide covers building custom authentication guards in AdonisJS. You will learn:

- When to create a custom guard instead of using built-in options
- How to design a user provider interface for your guard
- How to implement the guard contract
- How to generate and verify tokens
- How to register and use your custom guard

## Overview

AdonisJS ships with session, access token, and basic auth guards that cover most authentication needs. However, you might need a custom guard for specific requirements like JWT authentication, API keys, or integration with external identity providers.

A custom guard consists of two parts: a **user provider** interface that defines how to find users, and a **guard implementation** that handles the authentication logic. This separation allows the same guard to work with different data sources (Lucid models, Prisma, external APIs) by swapping the user provider.

This guide walks through building a JWT authentication guard as a practical example. The concepts apply to any custom authentication mechanism.

:::note
This is advanced content. Before building a custom guard, verify that the [session guard](./session_guard.md), [access tokens guard](./access_tokens_guard.md), or [basic auth guard](./basic_auth_guard.md) don't meet your needs.
:::

## Project structure

All the code in this guide goes into a single file that you can expand later. Create the file at `app/auth/guards/jwt.ts`:
```sh
mkdir -p app/auth/guards
touch app/auth/guards/jwt.ts
```

## Defining the user provider interface

Guards should not hardcode how users are fetched from the database. Instead, they define a user provider interface that describes the methods needed for authentication. This lets developers supply their own implementation based on their data layer.

For a JWT guard, the provider needs to find users by their ID (extracted from the token payload). Start by defining the interface:
```ts title="app/auth/guards/jwt.ts"
import { symbols } from '@adonisjs/auth'

/**
 * Bridge between the user provider and the guard.
 * Wraps the actual user object with methods the guard needs.
 */
export type JwtGuardUser<RealUser> = {
  getId(): string | number | BigInt
  getOriginal(): RealUser
}

/**
 * Interface that user providers must implement
 * to work with the JWT guard.
 */
export interface JwtUserProviderContract<RealUser> {
  /**
   * Property for TypeScript to infer the actual user type.
   * Not used at runtime.
   */
  [symbols.PROVIDER_REAL_USER]: RealUser

  /**
   * Create a guard user instance from the actual user object.
   */
  createUserForGuard(user: RealUser): Promise<JwtGuardUser<RealUser>>

  /**
   * Find a user by their ID.
   */
  findById(identifier: string | number | BigInt): Promise<JwtGuardUser<RealUser> | null>
}
```

The `JwtGuardUser` type acts as a bridge between your actual user object (a Lucid model, Prisma object, or plain object) and the guard. The guard uses `getId()` to get the user's identifier for the token payload and `getOriginal()` to return the user object after authentication.

The `RealUser` generic parameter allows the interface to work with any user type. A Lucid-based provider would return a model instance, while a Prisma-based provider would return a Prisma user object.

## Implementing the guard

The guard must implement the `GuardContract` interface from `@adonisjs/auth`. This interface defines the methods and properties that integrate the guard with AdonisJS authentication.

Start with the class structure and required properties:
```ts title="app/auth/guards/jwt.ts"
import { symbols } from '@adonisjs/auth'
import type { GuardContract } from '@adonisjs/auth/types'

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  /**
   * Events emitted by this guard. JWT guard doesn't emit events,
   * but the property is required by the interface.
   */
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  /**
   * Unique identifier for this guard type.
   */
  driverName: 'jwt' = 'jwt'

  /**
   * Whether authentication has been attempted during this request.
   */
  authenticationAttempted: boolean = false

  /**
   * Whether the current request is authenticated.
   */
  isAuthenticated: boolean = false

  /**
   * The authenticated user, if any.
   */
  user?: UserProvider[typeof symbols.PROVIDER_REAL_USER]

  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    // TODO: implement
  }

  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    // TODO: implement
  }

  async check(): Promise<boolean> {
    // TODO: implement
  }

  getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
    // TODO: implement
  }

  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    // TODO: implement
  }
}
```

### Accepting dependencies

The guard needs a user provider to find users and HTTP context to read request headers. It also needs configuration options like the JWT secret. Add these as constructor parameters:
```ts title="app/auth/guards/jwt.ts"
import type { HttpContext } from '@adonisjs/core/http'

export type JwtGuardOptions = {
  secret: string
}

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  #ctx: HttpContext
  #userProvider: UserProvider
  #options: JwtGuardOptions

  constructor(
    ctx: HttpContext,
    userProvider: UserProvider,
    options: JwtGuardOptions
  ) {
    this.#ctx = ctx
    this.#userProvider = userProvider
    this.#options = options
  }

  // ... rest of the class
}
```

### Generating tokens

Install the `jsonwebtoken` package to handle JWT creation and verification:
```sh
npm i jsonwebtoken @types/jsonwebtoken
```

Implement the `generate` method to create a signed JWT containing the user's ID:
```ts title="app/auth/guards/jwt.ts"
import jwt from 'jsonwebtoken'

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  // ... constructor and properties

  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    const token = jwt.sign({ userId: providerUser.getId() }, this.#options.secret)

    return {
      type: 'bearer',
      token: token,
    }
  }
}
```

The method uses the user provider to get the user's ID, then signs a JWT with that ID in the payload.

### Authenticating requests

The `authenticate` method reads the JWT from the request, verifies it, and fetches the corresponding user:
```ts title="app/auth/guards/jwt.ts"
import { errors, symbols } from '@adonisjs/auth'

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  // ... constructor and properties

  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    /**
     * Skip if already authenticated during this request
     */
    if (this.authenticationAttempted) {
      return this.getUserOrFail()
    }
    this.authenticationAttempted = true

    /**
     * Read the authorization header
     */
    const authHeader = this.#ctx.request.header('authorization')
    if (!authHeader) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    /**
     * Extract the token from "Bearer <token>"
     */
    const [, token] = authHeader.split('Bearer ')
    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    /**
     * Verify the token and extract the payload
     */
    const payload = jwt.verify(token, this.#options.secret)
    if (typeof payload !== 'object' || !('userId' in payload)) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    /**
     * Find the user by ID from the token payload
     */
    const providerUser = await this.#userProvider.findById(payload.userId)
    if (!providerUser) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    /**
     * Store the authenticated user and return
     */
    this.user = providerUser.getOriginal()
    this.isAuthenticated = true
    return this.user
  }
}
```

### Implementing helper methods

The `check` method is a non-throwing version of `authenticate`:
```ts title="app/auth/guards/jwt.ts"
async check(): Promise<boolean> {
  try {
    await this.authenticate()
    return true
  } catch {
    return false
  }
}
```

The `getUserOrFail` method returns the authenticated user or throws:
```ts title="app/auth/guards/jwt.ts"
getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
  if (!this.user) {
    throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
      guardDriverName: this.driverName,
    })
  }

  return this.user
}
```

### Supporting test authentication

The `authenticateAsClient` method is used by Japa's `loginAs` helper during testing. It returns headers that the test client should include:
```ts title="app/auth/guards/jwt.ts"
import type { AuthClientResponse } from '@adonisjs/auth/types'

async authenticateAsClient(
  user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
): Promise<AuthClientResponse> {
  const token = await this.generate(user)

  return {
    headers: {
      authorization: `Bearer ${token.token}`,
    },
  }
}
```

## Complete implementation

Here's the complete guard implementation:
```ts title="app/auth/guards/jwt.ts"
import jwt from 'jsonwebtoken'
import { symbols, errors } from '@adonisjs/auth'
import type { HttpContext } from '@adonisjs/core/http'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'

/**
 * Bridge between the user provider and the guard.
 */
export type JwtGuardUser<RealUser> = {
  getId(): string | number | BigInt
  getOriginal(): RealUser
}

/**
 * Interface for user providers compatible with the JWT guard.
 */
export interface JwtUserProviderContract<RealUser> {
  [symbols.PROVIDER_REAL_USER]: RealUser
  createUserForGuard(user: RealUser): Promise<JwtGuardUser<RealUser>>
  findById(identifier: string | number | BigInt): Promise<JwtGuardUser<RealUser> | null>
}

/**
 * Configuration options for the JWT guard.
 */
export type JwtGuardOptions = {
  secret: string
}

/**
 * JWT authentication guard implementation.
 */
export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>>
  implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]>
{
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  driverName: 'jwt' = 'jwt'
  authenticationAttempted: boolean = false
  isAuthenticated: boolean = false
  user?: UserProvider[typeof symbols.PROVIDER_REAL_USER]

  #ctx: HttpContext
  #userProvider: UserProvider
  #options: JwtGuardOptions

  constructor(
    ctx: HttpContext,
    userProvider: UserProvider,
    options: JwtGuardOptions
  ) {
    this.#ctx = ctx
    this.#userProvider = userProvider
    this.#options = options
  }

  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    const providerUser = await this.#userProvider.createUserForGuard(user)
    const token = jwt.sign({ userId: providerUser.getId() }, this.#options.secret)

    return {
      type: 'bearer',
      token: token,
    }
  }

  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    if (this.authenticationAttempted) {
      return this.getUserOrFail()
    }
    this.authenticationAttempted = true

    const authHeader = this.#ctx.request.header('authorization')
    if (!authHeader) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const [, token] = authHeader.split('Bearer ')
    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const payload = jwt.verify(token, this.#options.secret)
    if (typeof payload !== 'object' || !('userId' in payload)) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    const providerUser = await this.#userProvider.findById(payload.userId)
    if (!providerUser) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    this.user = providerUser.getOriginal()
    this.isAuthenticated = true
    return this.user
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
    if (!this.user) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
        guardDriverName: this.driverName,
      })
    }

    return this.user
  }

  async authenticateAsClient(
    user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
  ): Promise<AuthClientResponse> {
    const token = await this.generate(user)

    return {
      headers: {
        authorization: `Bearer ${token.token}`,
      },
    }
  }
}
```

## Registering the guard

Register your custom guard in `config/auth.ts`. The `JwtUserProviderContract` interface is compatible with the session guard's user provider, so you can reuse it:
```ts title="config/auth.ts"
import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import env from '#start/env'
import { JwtGuard } from '#auth/guards/jwt'

const jwtConfig = {
  secret: env.get('APP_KEY'),
}

const userProvider = sessionUserProvider({
  model: () => import('#models/user'),
})

const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: (ctx) => {
      return new JwtGuard(ctx, userProvider, jwtConfig)
    },
  },
})

export default authConfig
```

The guard factory receives the HTTP context and returns a new guard instance for each request.

## Using the guard

With the guard registered, use it like any built-in guard:
```ts title="start/routes.ts"
import User from '#models/user'
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.post('/login', async ({ request, auth }) => {
  const { email, password } = request.all()
  const user = await User.verifyCredentials(email, password)

  return await auth.use('jwt').generate(user)
})

router
  .get('/profile', async ({ auth }) => {
    return auth.getUserOrFail()
  })
  .use(middleware.auth({ guards: ['jwt'] }))
```

## Next steps

This implementation provides a foundation for JWT authentication. Consider extending it with:

- Token expiration (`exp` claim in the JWT payload)
- Refresh tokens for obtaining new access tokens
- Token revocation using a blocklist
- Additional claims like roles or permissions
- Custom error messages for different failure scenarios
