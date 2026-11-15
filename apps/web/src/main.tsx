import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { copy, defaultSiteContent, pages, type Locale, type Page, type SiteContentRow } from './content'
import { AdminPage } from './AdminPage'
import './styles.css'

type Route = Page | 'admin'

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api'

function normaliseHash(): Route {
  const value = window.location.hash.replace('#/', '').replace('#', '') as Route
  return value === 'admin' || pages.some((page) => page.id === value) ? value : 'home'
}

function App() {
  const [locale, setLocale] = useState<Locale>('ru')
  const [activePage, setActivePage] = useState<Route>(normaliseHash)
  const [contentRows, setContentRows] = useState<SiteContentRow[]>(defaultSiteContent)
  const pageId: Page = activePage === 'admin' ? 'home' : activePage
  const active = pages.find((page) => page.id === pageId) ?? pages[0]
  const localized = copy[locale]
  const fallbackContent = localized.pages[pageId]
  const activeContent = contentRows.find((row) => row.page === pageId && row.locale === locale)
  const getContent = (page: Page) => contentRows.find((row) => row.page === page && row.locale === locale)
  useEffect(() => { const sync = () => setActivePage(normaliseHash()); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  useEffect(() => { document.documentElement.lang = locale; document.title = localized.siteTitle }, [locale, localized.siteTitle])
  useEffect(() => {
    let mounted = true
    fetch(`${apiBase}/content?locale=${locale}`).then(async (response) => {
      if (!response.ok) return
      const payload = await response.json() as { items?: SiteContentRow[] }
      if (mounted && Array.isArray(payload.items) && payload.items.length) {
        setContentRows((current) => [...current.filter((row) => row.locale !== locale), ...payload.items!])
      }
    }).catch(() => undefined)
    return () => { mounted = false }
  }, [locale])
  const navigate = (page: Route) => { window.location.hash = `/${page}`; window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (activePage === 'admin') return <AdminPage onExit={() => navigate('home')} />

  return <main className={`page-shell ${activePage === 'home' ? 'home-shell' : ''}`}>
    <div className="grain" aria-hidden="true" />
    <header className={`site-header ${activePage === 'home' ? 'home-header' : ''}`}>
      <button className="monogram" onClick={() => navigate('home')} aria-label={localized.homeAria}><span>HC</span></button>
      <button className="identity" onClick={() => navigate('home')}>HELLEN CHARAFOULINA <span>◆</span> <em>{localized.tagline}</em></button>
      <nav aria-label={localized.navigationLabel}>{pages.map((page) => <button className={activePage === page.id ? 'active' : ''} key={page.id} onClick={() => navigate(page.id)}>{getContent(page.id)?.nav_label || localized.pages[page.id].label}</button>)}</nav>
      <div className="locales" aria-label={localized.languageLabel}>{(['ru', 'fr', 'en'] as Locale[]).map((item) => <button key={item} className={locale === item ? 'active' : ''} onClick={() => setLocale(item)}>{item.toUpperCase()}</button>)}</div>
    </header>
    {activePage === 'home' ? <>
      <section className="hero" id="top">
        <div className="hero-copy hero-paper-menu">
          <button className="hero-brand" onClick={() => navigate('home')}>{(getContent('home')?.title || 'Hellen Charafoulina').split(/\s+/)[0]}<br /><em>{(getContent('home')?.title || 'Hellen Charafoulina').split(/\s+/).slice(1).join(' ')}</em></button>
          <span className="hero-rule" aria-hidden="true" />
          <nav className="hero-menu" aria-label={localized.navigationLabel}>
            {pages.map((page) => <button className={activePage === page.id ? 'active' : ''} key={page.id} onClick={() => navigate(page.id)}>{getContent(page.id)?.nav_label || localized.pages[page.id].label}</button>)}
          </nav>
          <div className="hero-locales" aria-label={localized.languageLabel}>{(['ru', 'fr', 'en'] as Locale[]).map((item) => <button key={item} className={locale === item ? 'active' : ''} onClick={() => setLocale(item)}>{item.toUpperCase()}</button>)}</div>
        </div>
        <figure className="hero-art"><img src={getContent('home')?.image_url || '/images/art-nouveau-hero.png'} alt={getContent('home')?.image_alt || localized.imageAlt} /><figcaption>{localized.caption}</figcaption></figure>
      </section>
    </> : <section className={`inner-page inner-page--${activePage}`}>
      <div className="inner-page-art"><img src={activeContent?.image_url || getContent('home')?.image_url || '/images/art-nouveau-hero.png'} alt="" /></div>
      <div className="inner-page-content">
        <p className="kicker"><span>{active.index}</span><i aria-hidden="true">◆</i> HELLEN CHARAFOULINA</p>
        <span className="deco-rule" aria-hidden="true"><i>◆</i></span>
        <h1>{activeContent?.title || fallbackContent.title}</h1>
        <p className="inner-page-intro">{activeContent?.body || fallbackContent.text}</p>
        <button className="journal-link" onClick={() => navigate('home')}><span>{localized.backToHome}</span><i>↗</i></button>
      </div>
      <span className="inner-page-number" aria-hidden="true">{active.index}</span>
    </section>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
