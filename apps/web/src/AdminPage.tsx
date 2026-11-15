import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import { copy, defaultSiteContent, pages, type Locale, type Page, type SiteContentRow } from './content'

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api'
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
const localeOptions: Locale[] = ['ru', 'fr', 'en']

type AdminResponse = { items?: SiteContentRow[]; item?: SiteContentRow; error?: string; url?: string }
type WorkRecord = {
  id?: string
  title_ru: string; title_fr: string; title_en: string
  description_ru: string; description_fr: string; description_en: string
  cover_url: string; file_url: string; file_name: string; year: number; sort_order: number; published: boolean
}

const newWork = (): WorkRecord => ({
  title_ru: 'История календарей Адвента',
  title_fr: 'L’histoire des calendriers de l’Avent',
  title_en: 'The History of Advent Calendars',
  description_ru: 'От традиции к искусству роскоши. Иллюстрированное издание, 2026.',
  description_fr: 'De la tradition à l’art du luxe. Édition illustrée, 2026.',
  description_en: 'From tradition to the art of luxury. Illustrated edition, 2026.',
  cover_url: '', file_url: '', file_name: 'advent-calendar-2026-chapter-17.pdf', year: 2026, sort_order: 0, published: true,
})

function WorksLibraryEditor({ session }: { session: Session }) {
  const [items, setItems] = useState<WorkRecord[]>([])
  const [draft, setDraft] = useState<WorkRecord>(newWork())
  const [language, setLanguage] = useState<Locale>('ru')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${apiBase}/admin/works`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as AdminResponse & { items?: WorkRecord[] }
        if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить список работ.')
        const loaded = payload.items || []
        setItems(loaded)
        if (loaded[0]) setDraft(loaded[0])
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Ошибка загрузки работ.'))
  }, [session.access_token])

  const fieldKey = (base: 'title' | 'description') => `${base}_${language}` as keyof WorkRecord
  const value = (base: 'title' | 'description') => String(draft[fieldKey(base)])
  const update = (key: keyof WorkRecord, next: string | number | boolean) => setDraft((current) => ({ ...current, [key]: next }))

  async function upload(kind: 'cover' | 'pdf', file?: File) {
    if (!file) return
    if (kind === 'pdf' && file.type !== 'application/pdf') { setError('Выберите объединённую книгу в формате PDF.'); return }
    if (kind === 'cover' && !file.type.startsWith('image/')) { setError('Выберите изображение обложки.'); return }
    const limit = kind === 'pdf' ? 16 : 12
    if (file.size > limit * 1024 * 1024) { setError(`Размер файла должен быть меньше ${limit} МБ.`); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${apiBase}/admin/work-upload?kind=${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      })
      const payload = await response.json().catch(() => ({})) as AdminResponse
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Не удалось загрузить файл.')
      if (kind === 'pdf') {
        update('file_url', payload.url)
        update('file_name', file.name)
        setMessage('Книга загружена. Сохраните запись, чтобы показать её в разделе «Работы».')
      } else {
        update('cover_url', payload.url)
        setMessage('Обложка загружена. Сохраните запись, чтобы показать её на сайте.')
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка загрузки.') }
    finally { setBusy(false) }
  }

  async function save() {
    if (!draft.cover_url || !draft.file_url) { setError('Загрузите обложку и объединённый PDF книги.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${apiBase}/admin/works`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await response.json().catch(() => ({})) as AdminResponse & { item?: WorkRecord }
      if (!response.ok || !payload.item) throw new Error(payload.error || 'Не удалось сохранить работу.')
      setItems((current) => [payload.item!, ...current.filter((item) => item.id !== payload.item!.id)])
      setDraft(payload.item)
      setMessage('Книга сохранена и опубликована в разделе «Работы».')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка сохранения работы.') }
    finally { setBusy(false) }
  }

  return <section className="admin-works-library">
    <header className="admin-works-head">
      <div><p className="admin-section-label">КНИГИ И ПРОЕКТЫ</p><h2>Работы</h2><p>Загрузите обложку и единый PDF книги. Переводы карточки задаются отдельно для каждого языка сайта.</p></div>
      <div className="admin-works-actions">
        {items.map((item) => <button key={item.id} className={draft.id === item.id ? 'active' : ''} onClick={() => { setDraft(item); setMessage(''); setError('') }}>{item.title_ru}</button>)}
        <button onClick={() => { setDraft(newWork()); setMessage(''); setError('') }}>+ Новая работа</button>
      </div>
    </header>
    <div className="admin-locale-tabs admin-work-locales" aria-label="Язык карточки работы">{localeOptions.map((item) => <button key={item} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div>
    <div className="admin-form-grid admin-work-fields">
      <label className="admin-field">Название ({language.toUpperCase()})<input value={value('title')} onChange={(event) => update(fieldKey('title'), event.target.value)} /></label>
      <label className="admin-field">Год издания<input type="number" min="1000" max="9999" value={draft.year} onChange={(event) => update('year', Number(event.target.value))} /></label>
      <label className="admin-field admin-field-wide">Описание ({language.toUpperCase()})<textarea rows={3} value={value('description')} onChange={(event) => update(fieldKey('description'), event.target.value)} /></label>
    </div>
    <div className="admin-work-assets">
      <div className="admin-work-asset"><p className="admin-section-label">ОБЛОЖКА</p>{draft.cover_url && <img src={draft.cover_url} alt="Обложка книги" />}<label className="admin-upload-button">Выбрать обложку<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { void upload('cover', event.target.files?.[0]); event.target.value = '' }} disabled={busy} /></label></div>
      <div className="admin-work-asset"><p className="admin-section-label">КНИГА PDF</p><p className="admin-work-filename">{draft.file_url ? draft.file_name : 'Единый PDF с обложкой на первой странице'}</p><label className="admin-upload-button">Выбрать PDF<input type="file" accept="application/pdf,.pdf" onChange={(event) => { void upload('pdf', event.target.files?.[0]); event.target.value = '' }} disabled={busy} /></label></div>
    </div>
    <div className="admin-work-save-row"><span>{draft.id ? 'Редактируется существующая работа' : 'Новая запись будет добавлена в начало списка'}</span><button className="admin-primary" onClick={save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить работу'} <span>↗</span></button></div>
    {(message || error) && <p className={error ? 'admin-error admin-feedback' : 'admin-success admin-feedback'} role="status">{error || message}</p>}
  </section>
}

export function AdminPage({ onExit }: { onExit: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [rows, setRows] = useState<SiteContentRow[]>([])
  const [selectedPage, setSelectedPage] = useState<Page>('home')
  const [locale, setLocale] = useState<Locale>('ru')
  const [busy, setBusy] = useState(false)
  const [aiSource, setAiSource] = useState<Locale>('ru')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const configured = Boolean(supabase && supabaseUrl && supabaseKey)

  const defaultRows = useMemo(() => defaultSiteContent(), [])
  const current = rows.find((row) => row.page === selectedPage && row.locale === locale)
    ?? defaultRows.find((row) => row.page === selectedPage && row.locale === locale)!
  const localized = copy[locale]

  async function loadContent(activeSession: Session) {
    const response = await fetch(`${apiBase}/admin/content`, {
      headers: { Authorization: `Bearer ${activeSession.access_token}` },
    })
    const payload = await response.json().catch(() => ({})) as AdminResponse
    if (!response.ok) {
      if (response.status === 403) throw new Error('Вход разрешён, но этому аккаунту не выданы права редактора в Supabase.')
      throw new Error(payload.error || 'Не удалось загрузить тексты сайта.')
    }
    setRows(payload.items?.length ? payload.items : defaultRows)
    setSession(activeSession)
  }

  useEffect(() => {
    if (!supabase) { setError('Сначала укажите адрес Supabase и публичный ключ в настройках окружения.'); return }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive || !data.session) return
      loadContent(data.session).then(() => { if (alive) setError('') }).catch((reason: unknown) => {
        if (alive) { setSession(null); setError(reason instanceof Error ? reason.message : 'Нет доступа к редактору.') }
      })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) { setSession(null); setRows([]) }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    if (!supabase) { setError('Supabase пока не подключён.'); setBusy(false); return }
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      setPassword('')
      if (authError || !data.session) throw new Error(authError?.message || 'Не удалось войти. Проверьте почту и пароль.')
      await loadContent(data.session)
      setError('')
    } catch (reason) {
      await supabase.auth.signOut()
      setError(reason instanceof Error ? reason.message : 'Нет доступа к редактору.')
    } finally { setBusy(false) }
  }

  function updateField(field: keyof SiteContentRow, value: string) {
    setRows((existing) => {
      const found = existing.some((row) => row.page === selectedPage && row.locale === locale)
      const base = existing.find((row) => row.page === selectedPage && row.locale === locale)
        ?? defaultRows.find((row) => row.page === selectedPage && row.locale === locale)!
      const updated = { ...base, [field]: value }
      return found
        ? existing.map((row) => row.page === selectedPage && row.locale === locale ? updated : row)
        : [...existing, updated]
    })
    setMessage('')
  }

  async function saveContent() {
    if (!session) return
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${apiBase}/admin/content`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      const payload = await response.json().catch(() => ({})) as AdminResponse
      if (!response.ok || !payload.item) throw new Error(payload.error || 'Не удалось сохранить изменения.')
      setRows((existing) => [...existing.filter((row) => !(row.page === payload.item!.page && row.locale === payload.item!.locale)), payload.item!])
      setMessage('Изменения сохранены.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка сохранения.') }
    finally { setBusy(false) }
  }

  async function translateWithAI() {
    if (!session || !current.body.trim()) { setError('Добавьте текст страницы перед переводом.'); return }
    if (aiSource === locale) { setError('Выберите другой исходный язык.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${apiBase}/admin/translate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: selectedPage, sourceLocale: aiSource, targetLocale: locale }),
      })
      const payload = await response.json().catch(() => ({})) as AdminResponse & { translation?: { nav_label: string; title: string; body: string; image_alt: string } }
      if (!response.ok || !payload.translation) throw new Error(payload.error || 'Не удалось перевести страницу.')
      setRows((existing) => existing.map((row) => row.page === selectedPage && row.locale === locale ? { ...row, ...payload.translation } : row))
      setMessage('Перевод подготовлен. Проверьте его и нажмите «Сохранить».')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка перевода.') }
    finally { setBusy(false) }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session) return
    if (!file.type.startsWith('image/')) { setError('Выберите файл изображения.'); return }
    if (file.size > 12 * 1024 * 1024) { setError('Размер фотографии должен быть меньше 12 МБ.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const query = new URLSearchParams({ page: selectedPage, locale })
      const response = await fetch(`${apiBase}/admin/upload?${query}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
        body: file,
      })
      const payload = await response.json().catch(() => ({})) as AdminResponse
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Не удалось загрузить фотографию.')
      updateField('image_url', payload.url)
      setMessage('Фотография загружена. Нажмите «Сохранить», чтобы показать её на сайте.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка загрузки.') }
    finally { setBusy(false) }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setSession(null); setRows([]); setMessage(''); setError('')
  }

  if (!session) return <main className="page-shell admin-shell">
    <div className="grain" aria-hidden="true" />
    <button className="admin-exit" onClick={onExit}>← <span>На сайт</span></button>
    <section className="admin-login-card">
      <p className="admin-eyebrow">HELLEN CHARAFOULINA <i>◆</i> STUDIO</p>
      <span className="deco-rule" aria-hidden="true"><i>◆</i></span>
      <h1>Административная<br />панель</h1>
      <p className="admin-login-intro">Войдите, чтобы редактировать страницы, переводы и изображения.</p>
      <form className="admin-login-form" onSubmit={signIn}>
        <label>Электронная почта<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {!configured && <p className="admin-help">Для входа сначала подключите Supabase: задайте `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.</p>}
        <button className="admin-primary" type="submit" disabled={busy || !configured}>{busy ? 'Проверяем доступ…' : 'Войти в редактор'} <span>↗</span></button>
      </form>
    </section>
  </main>

  return <main className="page-shell admin-shell">
    <div className="grain" aria-hidden="true" />
    <header className="admin-topbar">
      <div className="admin-wordmark"><span className="deco-monogram">HC</span><div><b>HELLEN CHARAFOULINA</b><small>CONTENT STUDIO</small></div></div>
      <div className="admin-actions"><span className="admin-user">{session.user.email}</span><button onClick={onExit}>Предпросмотр сайта ↗</button><button onClick={signOut}>Выйти</button></div>
    </header>
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <p className="admin-section-label">СТРАНИЦЫ САЙТА</p>
        {pages.map((page) => <button key={page.id} className={selectedPage === page.id ? 'active' : ''} onClick={() => { setSelectedPage(page.id); setMessage(''); setError('') }}><span>{page.index}</span>{copy[locale].pages[page.id].label}<i>◇</i></button>)}
        <div className="admin-sidebar-note"><span>RU · FR · EN</span><small>Контент хранится отдельно для каждого языка.</small></div>
      </aside>
      <section className="admin-editor">
        <header className="admin-editor-head">
          <div><p className="admin-eyebrow">{pages.find((page) => page.id === selectedPage)?.index} <i>◆</i> РЕДАКТОР САЙТА</p><h1>{copy[locale].pages[selectedPage].title}</h1></div>
          <div className="admin-editor-controls">
            <div className="admin-locale-tabs" aria-label="Язык редактирования">{localeOptions.map((item) => <button key={item} className={locale === item ? 'active' : ''} onClick={() => { setLocale(item); setMessage(''); setError('') }}>{item.toUpperCase()}</button>)}</div>
            <button className="admin-primary admin-save" onClick={saveContent} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'} <span>↗</span></button>
          </div>
        </header>
        <div className="admin-form-grid">
          <label className="admin-field">Пункт меню<input value={current.nav_label} onChange={(event) => updateField('nav_label', event.target.value)} /></label>
          <label className="admin-field">Название страницы<input value={current.title} onChange={(event) => updateField('title', event.target.value)} /></label>
          <label className="admin-field admin-field-wide">Текст страницы<textarea rows={5} value={current.body} onChange={(event) => updateField('body', event.target.value)} /></label>
          <label className="admin-field admin-field-wide">Описание фотографии<input value={current.image_alt} onChange={(event) => updateField('image_alt', event.target.value)} /></label>
        </div>
        <div className="admin-translate-row"><div><p className="admin-section-label">ПЕРЕВОД С ПОМОЩЬЮ AI</p><p>Черновик перевода для выбранного языка. Перед сохранением проверьте текст.</p></div><select aria-label="Исходный язык" value={aiSource} onChange={(event) => setAiSource(event.target.value as Locale)}>{localeOptions.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select><button className="admin-secondary" onClick={translateWithAI} disabled={busy}>Подготовить перевод</button></div>
        <div className="admin-media-block">
          <div><p className="admin-section-label">ИЗОБРАЖЕНИЕ СТРАНИЦЫ</p><p>Загрузите фотографию JPG, PNG или WebP. Максимальный размер — 12 МБ.</p></div>
          <label className="admin-upload-button">Выбрать фотографию<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadImage} disabled={busy} /></label>
        </div>
        {current.image_url && <div className="admin-image-preview"><img src={current.image_url} alt={current.image_alt} /><span>Текущий файл</span></div>}
        {(message || error) && <p className={error ? 'admin-error admin-feedback' : 'admin-success admin-feedback'} role="status">{error || message}</p>}
        <p className="admin-editor-footnote">Редактируется версия <b>{locale.toUpperCase()}</b>. Изменения отобразятся на соответствующей языковой версии сайта.</p>
        {selectedPage === 'works' && <WorksLibraryEditor session={session} />}
      </section>
    </div>
  </main>
}
