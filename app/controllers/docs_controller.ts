import { errors } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { findDoc, resolveAsset, resolveLink } from '#collections/docs'

export default class DocsController {
  async handle({ view, params, request }: HttpContext) {
    const permalink = params['*'].join('/')
    const doc = findDoc(permalink)
    if (!doc) {
      throw new errors.E_ROUTE_NOT_FOUND(['GET', request.url()])
    }

    return view.share({ resolveLink, resolveAsset }).render('pages/doc', {
      menu: doc.zone,
      menuItem: doc.doc,
      permalink,
    })
  }
}
