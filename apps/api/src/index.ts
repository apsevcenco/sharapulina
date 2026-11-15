import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const port = Number(process.env.PORT) || 10000
const supabaseUrl = process.env.SUPABASE_URL?.trim() || ''
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || ''
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
const bucket = process.env.SUPABASE_MEDIA_BUCKET?.trim() || 'site-media'
const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || ''
const allowedOrigins = new Set([
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
  ...(process.env.WEB_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
])
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist')
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
}

const authClient = supabaseUrl && publishableKey
  ? createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
const adminClient = supabaseUrl && secretKey
  ? createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function send(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(payload))
}

function configured() {
  return Boolean(supabaseUrl && publishableKey && adminClient && authClient)
}

async function readJson(request: IncomingMessage, maxBytes = 64 * 1024): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > maxBytes) throw new ApiError(413, 'Request body is too large.')
    chunks.push(bytes)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new ApiError(400, 'Invalid JSON body.') }
}

async function readImage(request: IncomingMessage, maxBytes = 12 * 1024 * 1024): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > maxBytes) throw new ApiError(413, 'Image must be smaller than 12 MB.')
    chunks.push(bytes)
  }
  if (!size) throw new ApiError(400, 'Choose an image to upload.')
  return Buffer.concat(chunks)
}

async function requireAdmin(request: IncomingMessage) {
  if (!configured() || !adminClient || !authClient) throw new ApiError(503, 'The Supabase service is not configured.')
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) throw new ApiError(401, 'Sign in to continue.')
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  if (authError || !user) throw new ApiError(401, 'Your session is invalid or has expired.')
  const { data: membership, error: membershipError } = await adminClient
    .from('site_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (membershipError) throw new ApiError(503, 'The site_admins table is not configured.')
  if (!membership) throw new ApiError(403, 'This account does not have editor access.')
  return user
}

function validPage(value: unknown): value is string {
  return typeof value === 'string' && ['home', 'works', 'collections', 'about', 'journal', 'contacts'].includes(value)
}
function validLocale(value: unknown): value is string { return value === 'ru' || value === 'fr' || value === 'en' }
function stringField(value: unknown, max: number, field: string, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new ApiError(400, `Invalid ${field}.`)
  return value.trim()
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin
  const forwardedProtocol = request.headers['x-forwarded-proto']
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(',')[0]?.trim() || 'http'
  const sameOrigin = origin === `${protocol}://${request.headers.host || ''}`
  if (origin && !allowedOrigins.has(origin) && !sameOrigin) { send(response, 403, { error: 'Origin not allowed.' }); return }
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    let filePath: string
    try { filePath = resolve(webRoot, `.${decodeURIComponent(url.pathname)}`) }
    catch { filePath = '' }
    if (!filePath || (filePath !== webRoot && !filePath.startsWith(webRoot + sep)) || !existsSync(filePath) || !statSync(filePath).isFile()) filePath = resolve(webRoot, 'index.html')
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
    createReadStream(filePath).pipe(response)
    return
  }
  if (request.method === 'GET' && url.pathname === '/api/health') {
    send(response, 200, { ok: true, supabaseConfigured: configured() }); return
  }

  if (request.method === 'GET' && url.pathname === '/api/content') {
    if (!configured() || !adminClient) { send(response, 503, { error: 'Content service is not configured.' }); return }
    const locale = url.searchParams.get('locale')
    if (!validLocale(locale)) { send(response, 400, { error: 'Invalid locale.' }); return }
    const { data, error } = await adminClient.from('site_content')
      .select('page,locale,nav_label,title,body,image_url,image_alt,updated_at')
      .eq('locale', locale).order('page')
    if (error) { send(response, 503, { error: 'Site content is not available yet.' }); return }
    send(response, 200, { items: data || [] }); return
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/content') {
    await requireAdmin(request)
    if (!adminClient) throw new ApiError(503, 'The content service is not configured.')
    const { data, error } = await adminClient.from('site_content')
      .select('page,locale,nav_label,title,body,image_url,image_alt,updated_at').order('page').order('locale')
    if (error) throw new ApiError(503, 'Site content is not available yet.')
    send(response, 200, { items: data || [] }); return
  }

  if (request.method === 'PUT' && url.pathname === '/api/admin/content') {
    await requireAdmin(request)
    if (!adminClient) throw new ApiError(503, 'The content service is not configured.')
    const body = await readJson(request) as Record<string, unknown>
    if (!validPage(body.page) || !validLocale(body.locale)) throw new ApiError(400, 'Invalid page or language.')
    const row = {
      page: body.page,
      locale: body.locale,
      nav_label: stringField(body.nav_label, 80, 'menu label', true),
      title: stringField(body.title, 240, 'title', true),
      body: stringField(body.body, 16000, 'page text'),
      image_url: stringField(body.image_url, 2048, 'image URL'),
      image_alt: stringField(body.image_alt, 500, 'image description'),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await adminClient.from('site_content').upsert(row, { onConflict: 'page,locale' })
      .select('page,locale,nav_label,title,body,image_url,image_alt,updated_at').single()
    if (error || !data) throw new ApiError(503, 'Could not save the page. Apply the Supabase migration first.')
    send(response, 200, { item: data }); return
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/translate') {
    await requireAdmin(request)
    if (!adminClient) throw new ApiError(503, 'The content service is not configured.')
    if (!openaiApiKey) throw new ApiError(503, 'AI-перевод станет доступен после добавления OPENAI_API_KEY в Render.')
    const body = await readJson(request) as Record<string, unknown>
    if (!validPage(body.page) || !validLocale(body.sourceLocale) || !validLocale(body.targetLocale) || body.sourceLocale === body.targetLocale) {
      throw new ApiError(400, 'Choose a page and two different languages.')
    }
    const { data: source, error: sourceError } = await adminClient.from('site_content')
      .select('nav_label,title,body,image_alt').eq('page', body.page).eq('locale', body.sourceLocale).maybeSingle()
    if (sourceError || !source) throw new ApiError(404, 'Source language content was not found.')
    const languageNames: Record<string, string> = { ru: 'Russian', fr: 'French', en: 'English' }
    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL?.trim() || 'gpt-5-mini',
        instructions: `Translate the supplied website fields into ${languageNames[body.targetLocale as string]}. Preserve the writer's meaning, elegant editorial tone, proper names and art-history terminology. Return only a JSON object with string properties nav_label, title, body, image_alt. Do not add commentary.`,
        input: JSON.stringify(source),
        text: { format: { type: 'json_object' } },
        max_output_tokens: 3000,
      }),
    })
    const aiPayload = await aiResponse.json().catch(() => ({})) as { output_text?: string; error?: { message?: string }; output?: Array<{ content?: Array<{ text?: string }> }> }
    if (!aiResponse.ok) {
      console.error('[translate] OpenAI request failed', aiPayload.error?.message || aiResponse.status)
      throw new ApiError(502, 'Сервис AI-перевода не ответил. Проверьте настройки ключа и модели.')
    }
    const outputText = aiPayload.output_text || aiPayload.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || ''
    try {
      const translated = JSON.parse(outputText) as Record<string, unknown>
      const translation = {
        nav_label: stringField(translated.nav_label, 80, 'translated menu label', true),
        title: stringField(translated.title, 240, 'translated title', true),
        body: stringField(translated.body, 16000, 'translated body'),
        image_alt: stringField(translated.image_alt, 500, 'translated image description'),
      }
      send(response, 200, { translation }); return
    } catch (reason) {
      if (reason instanceof ApiError) throw reason
      throw new ApiError(502, 'AI-перевод вернул данные в неверном формате.')
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/upload') {
    await requireAdmin(request)
    if (!adminClient) throw new ApiError(503, 'The media service is not configured.')
    const page = url.searchParams.get('page')
    const locale = url.searchParams.get('locale')
    if (!validPage(page) || !validLocale(locale)) throw new ApiError(400, 'Invalid page or language.')
    const mime = (request.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
    const extensionByMime: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
    }
    const extension = extensionByMime[mime]
    if (!extension) throw new ApiError(415, 'Use a JPG, PNG, WebP or AVIF image.')
    const bytes = new Uint8Array(await readImage(request))
    const path = `${page}/${locale}/${Date.now()}-${randomUUID()}.${extension}`
    const { error } = await adminClient.storage.from(bucket).upload(path, bytes, {
      contentType: mime, cacheControl: '3600', upsert: false,
    })
    if (error) throw new ApiError(502, 'The image could not be stored. Check the site-media bucket.')
    const { data } = adminClient.storage.from(bucket).getPublicUrl(path)
    send(response, 201, { url: data.publicUrl, path }); return
  }

  send(response, 404, { error: 'Not found.' })
}

const server = createServer((request, response) => {
  void handle(request, response).catch((reason: unknown) => {
    const error = reason instanceof ApiError ? reason : new ApiError(500, 'The request could not be completed.')
    if (error.status >= 500) console.error('[api]', reason instanceof Error ? reason.message : 'Unknown server error')
    if (!response.headersSent) send(response, error.status, { error: error.message })
    else response.destroy()
  })
})

server.listen(port, '0.0.0.0', () => console.log(`Sharapulina API listening on ${port}`))
