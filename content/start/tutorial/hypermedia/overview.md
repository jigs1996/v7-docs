---
summary: Build a fully functional Hackernews clone with AdonisJS and learn how to create hypermedia-driven web applications.
---

# Building DevShow - A Community showcase website

In this tutorial, you will build DevShow. **DevShow is a small community showcase website where users can share what they’ve built.** Every user can create an account, publish a "showcase entry" (a project, tool, experiment, or anything they’re proud of), and browse entries created by others.

## Overview

We are taking a hands-on approach in this tutorial by building a real application from start to finish. Instead of learning about features in isolation, you will see how everything in AdonisJS works together — **routing, controllers, models, validation, authentication, and templating all coming together to create a functioning web application**.

By the end, you will have built a deployable DevShow web-app and gained a solid understanding of how AdonisJS features work together in practice.

## Understanding the starter kit

We are starting with the AdonisJS Hypermedia starter kit, which already has some basic scaffolding in place.

The starter kit includes authentication pages and functionality, so you don't have to build everything from scratch. This gives you a foundation to build upon as we add new features for our DevShow app.

Let's take a look at what we have already. Open the routes file.

```ts title="start/routes.ts"
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
```

As you can see, we already have routes set up for the home page, user signup, and login. Each route connects to a controller that handles the actual work.

:::note{title="The Auth middleware"}

If you notice, the `logout` route is protected using the `auth` middleware. This ensures a user must be first logged-in before they can logout. We will apply this middleware on every route that must be accessible only by the logged-in users.

:::

Let's look at one of these controllers to understand how a request flows through the application. Open the `app/controllers/new_account_controller.ts` file. This is the controller that handles new user registration.

```ts title="app/controllers/new_account_controller.ts"
import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const user = await User.create(payload)

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }
}
```

Let's walk through what is happening here.

- The `show` method is straightforward—it just renders the signup page using an Edge template.

- The `store` method is where things get interesting. When a user submits the signup form, this method validates the data using a validator, creates a new user in the database using the User model, mark them as logged-in using the `auth` object, and redirects to the home page.

Notice how the controller brings together different parts of the framework—models for database interaction, validators for data validation, and views for rendering HTML. This is the pattern we will follow throughout the tutorial as we build our app.

Before we move forward, go ahead and start your development server using `node ace serve --hmr` command. Visit the signup and login pages in your browser and try creating an account and logging in. Get comfortable with how the starter kit works—it will help you understand what we are building upon.
