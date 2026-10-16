// Мінімальний завантажувач .vue для node (без Vite): компілює скрипт і шаблон, стилі ігнорує.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, compileScript } from '@vue/compiler-sfc'

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.vue')) return nextLoad(url, context)
  const filename = fileURLToPath(url)
  const source = await readFile(filename, 'utf-8')
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length) throw errors[0]
  const script = compileScript(descriptor, { id: filename, inlineTemplate: true })
  const code = script.content.replace('export default', 'const __sfc__ =') + '\nexport default __sfc__\n'
  return { format: 'module', source: code, shortCircuit: true }
}
