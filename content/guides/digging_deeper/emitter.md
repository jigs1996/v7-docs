---
summary: Inbuilt event emitter created on top of emittery. Dispatches events asynchronously and fixes many common issues with the Node.js default Event emitter.
---

# Event Emitter

This guide covers the AdonisJS event emitter system. You will learn how to define and listen to events, emit events from your application code, create class-based events and listeners for better organization, make events type-safe using TypeScript, handle errors in event listeners, and fake events during testing.

## Overview

The event emitter in AdonisJS provides a robust system for implementing the observer pattern in your applications. Built on top of [emittery](https://github.com/sindresorhus/emittery), it dispatches events asynchronously and [fixes many common issues](https://github.com/sindresorhus/emittery#how-is-this-different-than-the-built-in-eventemitter-in-nodejs) present in Node.js's default EventEmitter.

Events are essential for decoupling different parts of your application. Instead of directly calling functions when something happens (like user registration or order completion), you emit an event. Multiple listeners can then respond to that event independently, making your code more modular and easier to test.

AdonisJS enhances emittery with several developer-friendly features. First, it provides static type safety by allowing you to define a list of events and their associated data types, catching errors at compile time rather than runtime. Second, it supports class-based events and listeners, letting you move event handling logic into dedicated files rather than cluttering your main application code. Finally, it includes the ability to fake events during tests, so you can verify that events are emitted without executing their side effects.

The emitter uses asynchronous event handling, meaning listeners run after the code that emits the event continues execution. This prevents slow listeners from blocking your application flow. However, this also means you cannot rely on listeners completing before your code continues, and listeners cannot access request-specific context like `HttpContext` after the HTTP request finishes.

## Basic usage

Event listeners are defined in the `start/events.ts` file. If this file doesn't exist in your project, create it using the `make:preload` command.

```sh
node ace make:preload events
```

Once you have the file, use the `emitter.on` method to listen to an event. The method accepts the event name as the first argument and the listener function as the second argument.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

emitter.on('user:registered', function (user) {
  console.log(user)
})
```

After defining the listener, you can emit the `user:registered` event from anywhere in your application using the `emitter.emit` method. The first argument is the event name, and the second argument is the data to pass to all listeners.

```ts
// title: app/controllers/users_controller.ts
import emitter from '@adonisjs/core/services/emitter'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async store({ request }: HttpContext) {
    const data = request.all()
    const user = await User.create(data)
    
    /**
     * Emit the event with the user instance.
     * All registered listeners will be called asynchronously.
     */
    emitter.emit('user:registered', user)
    
    return user
  }
}
```

If you only want to handle an event once and then automatically unsubscribe, use the `emitter.once` method instead of `emitter.on`.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

/**
 * This listener will only run for the first
 * user:registered event, then unsubscribe.
 */
emitter.once('user:registered', function (user) {
  console.log('First user registered:', user)
})
```

## Making events type-safe

AdonisJS requires you to define TypeScript types for every event you want to emit. This prevents typos in event names and ensures the correct data type is passed when emitting events. Event types are registered in the `types/events.ts` file.

In the following example, we register the `User` model as the data type for the `user:registered` event. After this declaration, TypeScript will enforce that `emitter.emit('user:registered', data)` receives a User instance.

```ts
// title: types/events.ts
import User from '#models/user'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'user:registered': User
  }
}
```

Now if you try to emit the event with incorrect data, TypeScript will show an error.

```ts
// ❌ TypeScript error: Argument of type 'string' is not assignable to parameter of type 'User'
emitter.emit('user:registered', 'some string')

// ✅ Correct: passing a User instance
emitter.emit('user:registered', user)
```

:::note

If you find defining types for every event cumbersome, you can switch to [class-based events](#class-based-events), which automatically infer types from the event class.

:::

## Class-based listeners

Instead of defining event listeners as inline functions in the `start/events.ts` file, you can create dedicated listener classes. This approach keeps your event handling logic organized, makes it easier to test individual listeners, and allows you to use dependency injection.

Listener classes are stored in the `app/listeners` directory. Create a new listener using the `make:listener` command.

See also: [Make listener command](../references/commands.md#makelistener)

```sh
node ace make:listener SendVerificationEmail
```

The generated listener file contains a class with a `handle` method. This method will be called when the event is emitted. You can add additional methods to the same class if you want to handle multiple events with a single listener class.

```ts
// title: app/listeners/send_verification_email.ts
import User from '#models/user'

export default class SendVerificationEmail {
  /**
   * The handle method receives the event data
   * (in this case, a User instance) as its first parameter.
   */
  handle(user: User) {
    // Send verification email to user.email
  }
}
```

After creating the listener class, bind it to an event in the `start/events.ts` file. Import the listener using the `#listeners` alias, which is configured using [Node.js subpath imports](../getting_started/folder_structure.md#the-sub-path-imports).

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import SendVerificationEmail from '#listeners/send_verification_email'

emitter.on('user:registered', [SendVerificationEmail, 'handle'])
```

The second element in the array (`'handle'`) specifies which method of the listener class should be called. This allows you to have different methods handling different events within the same listener class if needed.

### Lazy-loading listeners

Lazy loading listeners improves application boot time by deferring the import of listener classes until the event is actually emitted. This is especially beneficial when you have many listeners or when listener files import heavy dependencies.

To lazy-load a listener, replace the static import with a dynamic import function.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
// delete-start
import SendVerificationEmail from '#listeners/send_verification_email'
// delete-end
// insert-start
const SendVerificationEmail = () => import('#listeners/send_verification_email')
// insert-end

emitter.on('user:registered', [SendVerificationEmail, 'handle'])
```

The listener class will now only be loaded when a `user:registered` event is emitted, not during application startup. This pattern is recommended for all listeners unless you have a specific reason to load them eagerly.

### Dependency injection

Listener classes are instantiated using the [IoC container](../concepts/dependency_injection.md), which means you can type-hint dependencies in the constructor or in the `handle` method. The container will automatically resolve and inject these dependencies.

:::warning

You cannot inject `HttpContext` into listener classes. Events are processed asynchronously, so the listener may execute after the HTTP request has already finished and the context has been destroyed.

:::

In the following example, we inject a `TokensService` through the constructor. When this listener is invoked, the IoC container creates an instance of `TokensService` and passes it to the constructor.

```ts
// title: app/listeners/send_verification_email.ts (Constructor injection)
import { inject } from '@adonisjs/core'
import User from '#models/user'
import TokensService from '#services/tokens_service'

@inject()
export default class SendVerificationEmail {
  constructor(protected tokensService: TokensService) {}

  handle(user: User) {
    /**
     * Generate a verification token using the injected service.
     */
    const token = this.tokensService.generate(user.email)
    
    // Send email with token
  }
}
```

Alternatively, you can inject dependencies directly into the `handle` method. The first parameter will always be the event data, and subsequent parameters will be resolved by the container.

```ts
// title: app/listeners/send_verification_email.ts (Method injection)
import { inject } from '@adonisjs/core'
import User from '#models/user'
import TokensService from '#services/tokens_service'

export default class SendVerificationEmail {
  @inject()
  handle(user: User, tokensService: TokensService) {
    /**
     * The first parameter is the event data (User instance).
     * The second parameter is injected by the container.
     */
    const token = tokensService.generate(user.email)
    
    // Send email with token
  }
}
```

Both approaches work equally well. Constructor injection is preferable when you need the dependency in multiple methods, while method injection is cleaner when you only need it in the `handle` method.

## Class-based events

An event consists of two parts: an identifier (traditionally a string like `'user:registered'`) and the associated data (like the User instance). Class-based events combine both parts into a single class, where the class constructor serves as the identifier and an instance of the class holds the event data.

This approach offers several benefits. You don't need to manually register types in `types/events.ts` because TypeScript infers them from the class. The event class can include methods for transforming or validating the data. And using the class constructor as the event identifier eliminates typos in event names.

Create an event class using the `make:event` command.

See also: [Make event command](../references/commands.md#makeevent)

```sh
node ace make:event UserRegistered
```

The generated event class extends `BaseEvent` and serves as a container for event data. Accept the event data through the constructor and expose it as public properties.

```ts
// title: app/events/user_registered.ts
import { BaseEvent } from '@adonisjs/core/events'
import User from '#models/user'

export default class UserRegistered extends BaseEvent {
  constructor(public user: User) {
    super()
  }
}
```

### Listening to class-based events

Attach listeners to class-based events using the `emitter.on` method. Pass the event class reference as the first argument instead of a string name.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'

emitter.on(UserRegistered, function (event) {
  /**
   * The event parameter is an instance of UserRegistered.
   * Access the user through event.user.
   */
  console.log(event.user)
})
```

You can also use class-based listeners with class-based events. When the listener's `handle` method accepts an event class as its first parameter, TypeScript automatically enforces that the correct event type is used.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'
const SendVerificationEmail = () => import('#listeners/send_verification_email')

emitter.on(UserRegistered, [SendVerificationEmail])
```

```ts
// title: app/listeners/send_verification_email.ts
import UserRegistered from '#events/user_registered'

export default class SendVerificationEmail {
  /**
   * TypeScript knows this listener only handles
   * UserRegistered events.
   */
  handle(event: UserRegistered) {
    console.log(event.user)
  }
}
```

### Emitting class-based events

Emit a class-based event using the static `dispatch` method on the event class. The `dispatch` method accepts the same arguments as the event class constructor and creates an instance before emitting it.

```ts
// title: app/controllers/users_controller.ts
import User from '#models/user'
import UserRegistered from '#events/user_registered'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async store({ request }: HttpContext) {
    const data = request.all()
    const user = await User.create(data)
    
    /**
     * Dispatch the event. Behind the scenes, this creates
     * a new UserRegistered instance and emits it.
     */
    UserRegistered.dispatch(user)
    
    return user
  }
}
```

The `dispatch` method is equivalent to manually creating an instance and calling `emitter.emit`, but it's more concise and less error-prone.

## Simplifying events listening experience

When using class-based events and listeners together, you can use the `emitter.listen` method to simplify the registration process. This method provides a cleaner syntax when you have multiple listeners for a single event.

The `emitter.listen` method accepts the event class as the first argument and an array of listener classes as the second argument. All listener classes must have a `handle` method to process the event.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'

emitter.listen(UserRegistered, [
  () => import('#listeners/send_verification_email'),
  () => import('#listeners/register_with_payment_provider'),
  () => import('#listeners/provision_account'),
])
```

This approach makes it clear at a glance which listeners respond to which events, and it automatically handles method binding without needing to specify `'handle'` for each listener.

## Handling errors

When an event listener throws an error, it results in an [unhandledRejection](https://nodejs.org/api/process.html#event-unhandledrejection) because listeners execute asynchronously. Unhandled rejections can crash your application in production if not properly configured.

To prevent this, register a global error handler using the `emitter.onError` method. This callback receives the event name (or class), the error object, and the event data, allowing you to log errors or send them to an error tracking service.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

emitter.onError((event, error, eventData) => {
  logger.error({ event, err: error }, 'Event listener failed')
})
```

The error handler doesn't prevent other listeners from running. If one listener fails, the remaining listeners will still execute. However, the error handler gives you visibility into failures so you can debug and fix issues.

## Listening to all events

Use the `emitter.onAny` method to register a listener that receives all events emitted in your application. This is useful for debugging, logging, or implementing cross-cutting concerns like analytics.

The listener callback receives the event name (or class) as the first argument and the event data as the second argument.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

emitter.onAny((name, event) => {
  logger.debug({ name, event }, 'Event emitted')
})
```

Be cautious with wildcard listeners, as they will be called for every single event. Perform only lightweight operations to avoid impacting overall application performance.

## Unsubscribing from events

The `emitter.on` method returns an unsubscribe function. Call this function to remove the event listener when you no longer need it.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

const unsubscribe = emitter.on('user:registered', () => {
  // Handle event
})

/**
 * Later, when you want to stop listening:
 */
unsubscribe()
```

Alternatively, use the `emitter.off` method to remove a specific listener. This method requires a reference to the original listener function, so it works best with named functions rather than inline arrow functions.

```ts
// title: start/events.ts
import emitter from '@adonisjs/core/services/emitter'

function sendEmail() {
  // Handle event
}

/**
 * Register the listener
 */
emitter.on('user:registered', sendEmail)

/**
 * Remove the listener
 */
emitter.off('user:registered', sendEmail)
```

For class-based events, pass the event class reference instead of a string.

```ts
import UserRegistered from '#events/user_registered'

emitter.off(UserRegistered, sendEmail)
```

### emitter.offAny

Remove a wildcard listener (registered with `emitter.onAny`) using the `emitter.offAny` method.

```ts
const callback = (name, event) => {
  console.log(name, event)
}

emitter.onAny(callback)
emitter.offAny(callback)
```

### emitter.clearListeners

Remove all listeners for a specific event using the `emitter.clearListeners` method.

```ts
/**
 * Remove all listeners for a string-based event
 */
emitter.clearListeners('user:registered')

/**
 * Remove all listeners for a class-based event
 */
emitter.clearListeners(UserRegistered)
```

### emitter.clearAllListeners

Remove all listeners for all events using the `emitter.clearAllListeners` method. This is rarely needed in application code but can be useful in testing scenarios.

```ts
emitter.clearAllListeners()
```

## Faking events during tests

Event listeners often trigger side effects like sending emails, creating database records, or calling external APIs. During testing, you typically want to verify that the correct events are emitted without actually executing these side effects.

The event emitter provides a faking mechanism that captures emitted events instead of dispatching them to listeners. You can then write assertions to verify that specific events were emitted with the correct data.

In the following example, we call `emitter.fake()` before making an HTTP request to create a user. The fake captures any events emitted during the request, and we use the `events.assertEmitted` method to verify that a `UserRegistered` event was dispatched.

```ts
// title: tests/functional/users/create.spec.ts
import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import UserRegistered from '#events/user_registered'

test.group('User signup', () => {
  test('create a user account', async ({ client, cleanup }) => {
    /**
     * Enable faking for all events. The fake() method returns
     * an EventBuffer instance for making assertions.
     */
    const events = emitter.fake()
    
    /**
     * Restore normal event behavior after the test completes
     */
    cleanup(() => {
      emitter.restore()
    })
    
    /**
     * Make the HTTP request. Any events emitted during this
     * request will be captured by the fake.
     */
    await client
      .post('/signup')
      .form({
        email: 'foo@bar.com',
        password: 'secret',
      })
    
    /**
     * Assert that the UserRegistered event was emitted.
     * The actual listeners were not called.
     */
    events.assertEmitted(UserRegistered)
  })
})
```

The `emitter.fake()` method returns an instance of the [EventBuffer](https://github.com/adonisjs/events/blob/main/src/events_buffer.ts) class, which you use for assertions. The `emitter.restore()` method disables the fake and returns the emitter to normal behavior, allowing subsequent tests to emit events normally.

### Faking specific events

By default, `emitter.fake()` captures all events. If you only want to fake specific events while allowing others to be dispatched normally, pass the event names or classes as arguments.

```ts
/**
 * Fake only the user:registered event.
 * Other events will be dispatched normally.
 */
emitter.fake('user:registered')

/**
 * Fake multiple specific events
 */
emitter.fake([UserRegistered, OrderUpdated])
```

Calling `emitter.fake()` multiple times replaces the previous fake configuration, so all faking setup should be done in a single call.

### Events assertions

The `EventBuffer` class provides several assertion methods to verify that events were emitted correctly during your tests.

The `assertEmitted` method checks that a specific event was emitted at least once. You can optionally provide a callback function to inspect the event data and confirm it matches your expectations.

```ts
/**
 * Assert the event was emitted at least once
 */
events.assertEmitted('user:registered')
events.assertEmitted(OrderUpdated)
```

```ts
/**
 * Assert the event was emitted with specific data.
 * The callback receives the event and should return
 * true if the event matches your criteria.
 */
events.assertEmitted(OrderUpdated, ({ data }) => {
  return data.order.id === orderId
})
```

The `assertNotEmitted` method verifies that an event was never emitted, which is useful for testing that certain events don't fire in specific scenarios.

```ts
events.assertNotEmitted(OrderUpdated)

/**
 * With a callback to specify conditions
 */
events.assertNotEmitted(OrderUpdated, ({ data }) => {
  return data.order.status === 'cancelled'
})
```

The `assertEmittedCount` method verifies the exact number of times an event was emitted.

```ts
/**
 * Assert the OrderUpdated event was emitted exactly once
 */
events.assertEmittedCount(OrderUpdated, 1)
```

The `assertNoneEmitted` method verifies that no events of any kind were emitted during the test.

```ts
/**
 * Assert that no events were emitted at all
 */
events.assertNoneEmitted()
```

## List of available events

AdonisJS core and its official packages emit various events that you can listen to. For a complete list of available events and their data types, check the [events reference guide](../references/events.md).

## See also

- [Events reference](../references/events.md) - Complete list of events emitted by AdonisJS
- [Dependency injection](../concepts/dependency_injection.md) - Understanding how listener classes are instantiated
- [Folder structure](../getting_started/folder_structure.md#the-sub-path-imports) - Understanding subpath imports for the `#listeners` alias
