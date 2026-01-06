import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

export default defineConfig({
  default: 'cbc',
  list: {
    cbc: drivers.aes256cbc({
      id: 'cbc',
      keys: [env.get('APP_KEY').release()],
    }),
  },
})
