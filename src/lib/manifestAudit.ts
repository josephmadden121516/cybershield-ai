/**
 * Static manifest parser for dependency scans. Reads pasted project files
 * (never touches a live target) and extracts exact package versions for
 * lookup against the public OSV vulnerability database.
 */

export interface ManifestPackage {
  name: string
  version: string
  ecosystem: 'npm' | 'PyPI' | 'Go'
}

export interface ParsedManifest {
  format: string
  packages: ManifestPackage[]
  skipped: number
}

const MAX_PACKAGES = 100

function cleanNpmVersion(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || /^(workspace|file|link|http|git|npm):/.test(trimmed)) return null
  const match = /^[\^~><=v\s]*(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?/.exec(trimmed)
  return match ? match[0].replace(/^[\^~><=v\s]*/, '') : null
}

function parsePackageJson(text: string, packages: ManifestPackage[]): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const groups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  let sawGroup = false
  for (const group of groups) {
    const deps = record[group]
    if (deps === null || typeof deps !== 'object' || Array.isArray(deps)) continue
    sawGroup = true
    for (const [name, version] of Object.entries(deps as Record<string, unknown>)) {
      if (typeof version !== 'string') continue
      const cleaned = cleanNpmVersion(version)
      if (cleaned) packages.push({ name, version: cleaned, ecosystem: 'npm' })
    }
  }
  return sawGroup ? 'package.json' : null
}

function parsePackageLock(text: string, packages: ManifestPackage[]): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (record.lockfileVersion === undefined && record.packages === undefined) return null
  const nested = record.packages
  if (nested !== null && typeof nested === 'object' && !Array.isArray(nested)) {
    for (const [key, entry] of Object.entries(nested as Record<string, unknown>)) {
      if (!key.startsWith('node_modules/') || key.slice('node_modules/'.length).includes('node_modules/')) {
        continue
      }
      const name = key.slice('node_modules/'.length)
      if (
        entry !== null &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as Record<string, unknown>).version === 'string'
      ) {
        packages.push({
          name,
          version: ((entry as Record<string, unknown>).version as string).trim(),
          ecosystem: 'npm',
        })
      }
    }
    return 'package-lock.json'
  }
  const flat = record.dependencies
  if (flat !== null && typeof flat === 'object' && !Array.isArray(flat)) {
    for (const [name, entry] of Object.entries(flat as Record<string, unknown>)) {
      if (
        entry !== null &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as Record<string, unknown>).version === 'string'
      ) {
        packages.push({
          name,
          version: ((entry as Record<string, unknown>).version as string).trim(),
          ecosystem: 'npm',
        })
      }
    }
    return 'package-lock.json'
  }
  return null
}

function parseRequirements(text: string, packages: ManifestPackage[]): string | null {
  const lines = text.split('\n')
  let matched = 0
  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim()
    if (!line || line.startsWith('-')) continue
    const match = /^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(===|==|~=|>=|>|<=|<|!=)\s*([A-Za-z0-9_.*+-]+)/.exec(line)
    if (!match) continue
    matched += 1
    const [, name, operator, version] = match
    // OSV needs exact versions; ranged pins cannot be resolved safely.
    if ((operator === '==' || operator === '===') && !version.includes('*')) {
      packages.push({ name, version, ecosystem: 'PyPI' })
    }
  }
  return matched > 0 ? 'requirements.txt' : null
}

function parseGoMod(text: string, packages: ManifestPackage[]): string | null {
  if (!/^module\s+\S+/m.test(text)) return null
  const lines = text.split('\n')
  let inRequire = false
  for (const rawLine of lines) {
    const line = rawLine.split('//')[0].trim()
    if (/^require\s*\($/.test(line)) {
      inRequire = true
      continue
    }
    if (inRequire && line === ')') {
      inRequire = false
      continue
    }
    const multi = inRequire ? /^\s*(\S+)\s+(v\S+)/.exec(rawLine.split('//')[0]) : null
    const single = !inRequire ? /^require\s+(\S+)\s+(v\S+)/.exec(line) : null
    const match = multi ?? single
    if (match) packages.push({ name: match[1], version: match[2], ecosystem: 'Go' })
  }
  return 'go.mod'
}

/**
 * Detect the manifest format and extract exact versions. Returns the
 * detected format plus any packages found; throws when nothing matches.
 */
export function parseManifestFile(text: string): ParsedManifest {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Paste a manifest file to scan.')
  if (trimmed.length > 60000) {
    throw new Error('That manifest is too large to scan (over 60,000 characters).')
  }
  const packages: ManifestPackage[] = []
  const format =
    parsePackageLock(trimmed, packages) ??
    parsePackageJson(trimmed, packages) ??
    parseRequirements(trimmed, packages) ??
    parseGoMod(trimmed, packages)
  if (!format) {
    throw new Error(
      'Could not recognize that file. Paste a package.json, package-lock.json, requirements.txt, or go.mod.'
    )
  }
  const unique = new Map<string, ManifestPackage>()
  for (const pkg of packages) unique.set(`${pkg.ecosystem}:${pkg.name}@${pkg.version}`, pkg)
  const deduped = [...unique.values()]
  return {
    format,
    packages: deduped.slice(0, MAX_PACKAGES),
    skipped: Math.max(0, deduped.length - MAX_PACKAGES),
  }
}
