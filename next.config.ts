import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

import { rehypePlugins } from './src/mdx/rehype'
import { remarkPlugins } from './src/mdx/remark'

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins,
    rehypePlugins,
  },
})

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    externalDir: true,
  },
}

export default withMDX(nextConfig)
