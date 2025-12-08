declare module '*.mdx' {
  let MDXComponent: (props: React.ComponentPropsWithoutRef<'div'>) => JSX.Element
  export default MDXComponent
  export const metadata: Record<string, unknown>
}

