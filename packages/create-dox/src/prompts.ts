import { input, select } from '@inquirer/prompts'
import { basename } from 'node:path'
import { resolve } from 'node:path'

export interface ScaffoldAnswers {
  projectDir: string
  projectName: string
  description: string
  brandPreset: string
  repoUrl: string
  doInstall: boolean
}

export async function gatherAnswers(
  dirArg: string | undefined,
  useDefaults: boolean,
): Promise<ScaffoldAnswers> {
  // 1. Project directory
  let projectDir: string
  if (dirArg) {
    projectDir = resolve(dirArg)
  } else if (useDefaults) {
    projectDir = resolve('my-docs')
  } else {
    const dirName = await input({
      message: '  Project directory:',
      default: 'my-docs',
    })
    projectDir = resolve(dirName)
  }

  // 2. Project name
  const defaultName = basename(projectDir)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const projectName = useDefaults
    ? defaultName
    : await input({
        message: '  Project name:',
        default: defaultName,
      })

  // 3. Description
  const defaultDesc = `Documentation for ${projectName}.`
  const description = useDefaults
    ? defaultDesc
    : await input({
        message: '  Description:',
        default: defaultDesc,
      })

  // 4. Brand preset
  const brandPreset = useDefaults
    ? 'primary'
    : await select({
        message: '  Brand preset:',
        choices: [
          { name: 'primary', value: 'primary' },
          { name: 'secondary', value: 'secondary' },
        ],
        default: 'primary',
      })

  // 5. GitHub repo (optional)
  const repoUrl = useDefaults
    ? ''
    : await input({
        message: '  GitHub repo URL (optional):',
        default: '',
      })

  // 6. Install deps?
  let doInstall = true
  if (!useDefaults) {
    const shouldInstall = await input({
      message: '  Install dependencies? (Y/n):',
      default: 'Y',
    })
    doInstall = shouldInstall.toLowerCase() !== 'n'
  }

  return { projectDir, projectName, description, brandPreset, repoUrl, doInstall }
}
