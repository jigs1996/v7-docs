# Command line and REPL

You might be wondering why we're starting the tutorial covering CLI and REPL instead of jumping straight into building features. Here's why: throughout this tutorial, you'll constantly use Ace commands to generate controllers, models, and other files. Learning these tools now prevents us from interrupting the flow later.

More importantly, the REPL will become our playground for experimenting with models and databases. When we explore database queries, filters, and relationships in later sections, we'll use the REPL to try things out. It's a throwaway environment that lets us focus on learning concepts without the ceremony of building complete features.

## Exploring available commands

Let's start by seeing what commands AdonisJS gives us. Run this in your terminal:

```bash
node ace list
```

You'll see something like this:

:::media
![](./node_ace_list.png)
:::

Notice how the commands are grouped together? 
- The `make:*` commands help you generate files.
- The `migration:*` commands help you run and revert database migrations.
- The `db:*` commands handle database seeding, and so on.

Want to know more about a specific command? Just add `--help` to the end. This shows you everything that command can do, including any options you can pass to it.

```bash
node ace make:controller --help
```

## Using the REPL

Alright, now for the fun part - the REPL. This will be our experimentation playground throughout the tutorial. Let's fire it up:

```bash
node ace repl

# Type ".ls" to a view list of available context methods/properties
# > (js)
```

You should see a prompt pop up, letting you know the REPL is ready for your commands. The cool thing about the REPL is that it comes with some handy helper functions. The one we'll use most is `loadModels()`, which brings in all your application's models.

Let's create a new user that we can also use to login in our app. In the REPL, type:

```bash
await loadModels()

# recursively reading models from "app/models"
# Loaded models module. You can access it using the "models" variable
```

This loads all your models and makes them available under the `models` object. Now let's create our first user:

```typescript
await models.user.create({ fullName: 'Harminder Virk', email: 'virk@adonisjs.com', password: 'secret' })
```

You should see the newly created user object pop up, complete with an `id`, all the properties you provided, and some timestamps. Let's add another one:
```typescript
await models.user.create({ fullName: 'Jane Doe', email: 'jane@example.com', password: 'secret' })
```

Now let's see all the users we've created:
```typescript
await models.user.all()
```

There they are - both users in an array! You can also grab a specific user by their id and access the model properties using the `user` variable.
```typescript
const user = await models.user.find(1)

// > (js) user.id
// 1
// > (js) user.email
// 'virk@adonisjs.com'
```

This gives you back the user with id 1. Now let's clean up by deleting this user:
```typescript
await user.delete()
```

If you list all users again, you'll see only Jane remains:
```typescript
await models.user.all()
```

When you're done playing around in the REPL, just press `Ctrl+D` or type `.exit` to get back to your regular terminal.

## What you learned

You now know how to:
- View all available Ace commands using `node ace list`
- Get help for specific commands with the `--help` flag
- Start an interactive REPL session with `node ace repl`
- Use the `loadModels()` helper to access your models
- Create, query, and delete records using the REPL
