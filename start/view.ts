import edge from 'edge.js'
import { DateTime } from 'luxon'
import { tv } from 'tailwind-variants'
import { toText } from 'hast-util-to-text'
import { edgeMarkdown } from 'edge-markdown'
import { icons as uiwIcons } from '@iconify-json/uiw'
import { addCollection, edgeIconify } from 'edge-iconify'
import { icons as mynauiIcons } from '@iconify-json/mynaui'
import { icons as tablerIcons } from '@iconify-json/tabler'

edge.use(edgeIconify)
edge.use(edgeMarkdown, {
  prefix: 'markdown',
  highlight: {
    enabled: true,
    langs: [
      'typescript',
      'json',
      'edge',
      'html',
      'sql',
      'bash',
      'dotenv',
      'tsx',
      'handlebars',
      'vue',
    ],
    theme: 'github-dark',
  },
  allowHTML: true,
  toc: {
    enabled: true,
    maxDepth: 2,
  },
})

addCollection(mynauiIcons)
addCollection(uiwIcons)
addCollection(tablerIcons)

edge.global('tv', tv)
edge.global('hastToText', toText)
edge.global('DateTime', DateTime)
edge.global('parseCodeblockTitle', function (title: string) {
  if (title.startsWith('❌')) {
    return {
      icon: 'mynaui:x',
      classes: 'text-red-400',
      title: title.split('❌')[1],
    }
  }

  if (title.startsWith('✅')) {
    return {
      icon: 'mynaui:check',
      classes: 'text-green-400',
      title: title.split('✅')[1],
    }
  }

  return {
    title,
  }
})
