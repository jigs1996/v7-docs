---
title: 'Introduction'
description: 'An overview of AdonisJS and the design principles behind it.'
---

# Introduction

AdonisJS is a **backend-first, type-safe framework** for building web applications with Node.js and TypeScript. It provides the core building blocks for writing and maintaining complete backends, eliminating the need for third-party services to handle **common features such as authentication, file uploads, caching, and rate limiting**.

Each AdonisJS application is written in TypeScript, runs in ESM mode, and offers end-to-end type safety across the entire stack.

## Who is AdonisJS for?

AdonisJS is designed for developers building production web applications who need more structure than Express but less ceremony than enterprise frameworks. If you're building REST APIs, server-rendered applications, or full-stack web apps, and you value conventions over configuration, AdonisJS will feel natural.

If you're coming from Laravel, Rails, or Django, you'll recognize the MVC patterns and conventions. If you've worked with Express or Fastify, you'll appreciate having structure and batteries included without sacrificing simplicity.

## Why AdonisJS

AdonisJS provides the structure, consistency, and tooling expected from a full-featured framework, while remaining lightweight and modern in design.

It is suitable for teams that value:

- **Ownership of backend logic**: Build critical features in-house rather than depending on external services for authentication, rate-limiting, or background jobs.

- **Cohesive developer experience**: Every AdonisJS application follows the same conventions and directory structure, making it easy to onboard new developers and share knowledge across teams.

- **Unified ecosystem**: Core features are maintained together under consistent quality standards, eliminating dependency fragmentation.

- **Extensibility and freedom**: Core features are built from low-level packages that you can use directly to create custom flows, integrations, or abstractions.

AdonisJS is designed to provide everything you need for real-world backend applications, while remaining approachable and easy to configure.

## What can you build with AdonisJS?

AdonisJS is designed for real-world backend applications:

- **REST APIs**: Build type-safe APIs for mobile apps or SPAs. Companies use AdonisJS to power APIs serving millions of requests.

- **Full-stack web applications**: Use Edge templates for server-rendered pages, or pair with Vue/React for hybrid applications. The MVC structure keeps your backend organized as your app grows.

- **SaaS platforms**: Build multi-tenant applications without relying on third-party services for core functionality like authentication, authorization, or background jobs.

Whether you're building a startup MVP or a production system serving thousands of users, AdonisJS provides the foundation without getting in your way.

## Practical, not overengineered

Many frameworks introduce enterprise abstractions that complicate projects without adding clarity. AdonisJS focuses on a different approach.

It offers a **practical development model** that focuses on clarity, type safety, and maintainability rather than patterns for their own sake. The framework encourages good structure through conventions but never enforces heavy architectural layers.

The framework includes batteries such as routing, middleware, validation, and ORM out of the box, allowing teams to focus on application logic instead of building common patterns repeatedly.

AdonisJS APIs are functional and modern. You can use class-based components where a structured approach is helpful, such as in controllers, models, and services.

## How AdonisJS compares

**vs. Express/Fastify**: AdonisJS provides structure and conventions that Express lacks, while remaining just as performant. Instead of assembling packages yourself, you get an integrated toolkit out of the box.

**vs. NestJS**: AdonisJS focuses on practical patterns over enterprise abstractions. No decorators everywhere, no dependency injection containers to configure, just straightforward TypeScript code that follows clear conventions.

**vs. Laravel/Rails**: If you love Laravel or Rails but work in Node.js, AdonisJS brings that same cohesive experience: migrations, seeders, factories, model relationships, and consistent conventions.

Choose AdonisJS when you want the productivity of a full-featured framework without the complexity of enterprise patterns or the fragmentation of minimal frameworks.

## MVC with a configurable view layer

AdonisJS uses the **Model-View-Controller (MVC)** pattern to keep data, logic, and presentation separate. The view layer is optional and can be configured to fit your needs.

You can use:

- **Edge**, the official server-side templating engine, for traditional full-stack applications.
- **Vue**, **React**, or another frontend framework to build a single-page or hybrid application.
- Or skip the view layer entirely when building an API-first or backend-only service.

Most backend code, such as routing, controllers, models, and middleware, stays the same no matter how you render views. This flexibility allows you to start with server-side rendering and transition to a modern SPA setup later, without modifying your core backend logic.

## Ecosystem and stability

AdonisJS has been in active development since 2015, with version 7 representing years of real-world usage and refinement. The framework is maintained by its creator full-time, with support from the core team members and an active community.

The ecosystem includes [official packages](https://adonisjs.com/packages) for common backend needs, all maintained by the core team with the same quality standards. Community packages extend functionality for specific needs like payment processing, cloud storage, and third-party integrations.

All documentation, tooling, and packages follow semantic versioning, ensuring stable upgrades and long-term maintainability.

## Next steps

AdonisJS documentation is organized to guide both new and experienced developers:

- If this is your **first time** using AdonisJS, then continue reading all the docs in the **Start** section and eventually build an app by following the [Tutorial](./tutorial/hypermedia/overview.md).

- If you already know the basics, explore the [Guides](../guides/basics/routing.md) to learn specific topics like validation, database management, or testing.
