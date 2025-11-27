import vine from '@vinejs/vine'
import { dirname, resolve } from 'node:path'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { type Infer } from '@vinejs/vine/types'
import vite from '@adonisjs/vite/services/main'
import { loaders } from '@adonisjs/content/loaders'

const noSnakeCase = vine.createRule((value, _, field) => {
  if ((value as string).includes('_')) {
    field.report(
      `The value for (${field.parent.title}) cannot be in snakecase`,
      'no_snake_case',
      field
    )
  }
})
const noDashCase = vine.createRule((value, _, field) => {
  if ((value as string).includes('-')) {
    field.report('The field value cannot be in dashcase', 'no_dash_case', field)
  }
})

const singleDoc = vine.object({
  title: vine.string(),
  permalink: vine.string().use(noSnakeCase()),
  oldUrls: vine.array(vine.string()).optional(),
  contentPath: vine.string().use(noDashCase()).toAbsolutePath(),
})

const categoryDocs = vine.object({
  category: vine.string(),
  children: vine.array(singleDoc.clone()),
})

const menuSchema = vine.array(categoryDocs)

const sectionsNames: ['guides', 'start', 'reference'] = ['guides', 'start', 'reference']
const docsSections = Collection.multi(sectionsNames, (section) => {
  return Collection.create({
    schema: menuSchema.clone(),
    cache: app.inProduction,
    loader: loaders.jsonLoader(app.makePath('content', section, 'db.json')),
    views: {
      menu(data: Infer<typeof menuSchema>) {
        return data.map((node) => {
          return {
            category: node.category,
            isChild(permalink: string): boolean {
              return !!node.children.find((child) => child.permalink === permalink)
            },
            children: node.children,
          }
        })
      },
      permalinksTree(data: Infer<typeof menuSchema>) {
        return data.reduce<Record<string, Infer<typeof singleDoc>>>((result, node) => {
          node.children.forEach((doc) => {
            result[doc.permalink] = doc
          })
          return result
        }, {})
      },
      contentPathsTree(data: Infer<typeof menuSchema>) {
        return data.reduce<Record<string, Infer<typeof singleDoc>>>((result, node) => {
          node.children.forEach((doc) => {
            result[doc.contentPath] = doc
          })
          return result
        }, {})
      },
      findByPermalink(data: Infer<typeof menuSchema>, permalink: string) {
        return this.permalinksTree(data)[permalink] ?? this.permalinksTree(data)[`/${permalink}`]
      },
      has(data: Infer<typeof menuSchema>, permalink: string) {
        return !!this.findByPermalink(data, permalink)
      },
      findByContentPath(data: Infer<typeof menuSchema>, contentPath: string) {
        return this.contentPathsTree(data)[contentPath]
      },
    },
  })
})

export async function findDoc(permalink: string) {
  const sections = await docsSections.load()

  for (const sectionName of sectionsNames) {
    const section = sections[sectionName]
    const doc = section.findByPermalink(permalink)
    if (doc) {
      return {
        doc,
        section,
        sections,
      }
    }
  }

  return null
}

export async function resolveLink(fromFile: string, toFile: string) {
  const contentFilePath = app.makePath(resolve(dirname(fromFile), toFile))
  const sections = await docsSections.load()

  for (const sectionName of sectionsNames) {
    const section = sections[sectionName]
    const doc = section.findByContentPath(contentFilePath)
    if (doc) {
      return `/${doc.permalink}`
    }
  }
  return null
}

export function resolveAsset(fromFile: string, toFile: string) {
  const assetAbsolutePath = app.relativePath(resolve(dirname(fromFile), toFile))
  return vite.assetPath(assetAbsolutePath)
}
