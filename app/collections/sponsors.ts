import env from '#start/env'
import vine from '@vinejs/vine'
import app from '@adonisjs/core/services/app'
import { Collection } from '@adonisjs/content'
import { loaders } from '@adonisjs/content/loaders'

export const sponsors = Collection.create({
  cache: app.inProduction,
  loader: loaders.ghSponsors({
    login: 'thetutlage',
    isOrg: false,
    outputPath: app.makePath('content/sponsors/db.json'),
    refresh: 'daily',
    ghToken: env.get('GH_TOKEN'),
  }),
  schema: vine.array(
    vine.object({
      sponsorName: vine.string().optional(),
      sponsorLogin: vine.string(),
      sponsorAvatarUrl: vine.string().url(),
      privacyLevel: vine.string(),
      isActive: vine.boolean().optional(),
    })
  ),
  views: {
    active(data) {
      return data.filter(
        (sponsor) => sponsor.privacyLevel === 'PUBLIC' && sponsor.isActive === true
      )
    },
    aggregates(data) {
      return {
        active: this.active(data).length,
        past: this.past(data).length,
      }
    },
    past(data) {
      return data.filter(
        (sponsor) => sponsor.privacyLevel === 'PUBLIC' && sponsor.isActive === false
      )
    },
  },
})
