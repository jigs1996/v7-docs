import type { HttpContext } from '@adonisjs/core/http'
import { featuredSponsors } from '#collections/featured_sponsors'
import { sponsors } from '#collections/sponsors'

export default class HomeController {
  async handle({ view }: HttpContext) {
    return view.render('pages/home', {
      featuredSponsors: await featuredSponsors.load(),
      sponsors: await sponsors.load(),
    })
  }
}
