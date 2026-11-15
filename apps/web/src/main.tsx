import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Locale = 'ru' | 'fr' | 'en'
type Page = 'home' | 'works' | 'collections' | 'about' | 'journal' | 'contacts'

const pages: Array<{ id: Page; label: string; index: string; title: string; text: string }> = [
  { id: 'home', label: 'ГЛАВНАЯ', index: '01', title: 'Искусство требует\nмедленного взгляда.', text: 'От текучей линии ар-нуво до безупречной геометрии ар-деко: здесь предметы читаются как портреты своего времени.' },
  { id: 'works', label: 'РАБОТЫ', index: '02', title: 'Работы', text: 'Авторские исследования, эссе и визуальные истории о стиле, формах и предметах искусства.' },
  { id: 'collections', label: 'КОЛЛЕКЦИИ', index: '03', title: 'Коллекции', text: 'Отобранные предметы, редкие издания и небольшие частные собрания с вниманием к происхождению.' },
  { id: 'about', label: 'О ХУДОЖНИЦЕ', index: '04', title: 'О художнице', text: 'Личный взгляд на искусство, где исторический контекст встречается с интуицией коллекционера.' },
  { id: 'journal', label: 'ЖУРНАЛ', index: '05', title: 'Журнал', text: 'Заметки о декоративных искусствах, архитектуре, антиквариате и людях, создавших язык эпохи.' },
  { id: 'contacts', label: 'КОНТАКТЫ', index: '06', title: 'Контакты', text: 'Для предложений о проектах, публикациях и частных коллекциях.' },
]

const translations: Record<Locale, string> = { ru: 'Открыть журнал', fr: 'Ouvrir le journal', en: 'Open the journal' }

function normaliseHash(): Page {
  const value = window.location.hash.replace('#/', '').replace('#', '') as Page
  return pages.some((page) => page.id === value) ? value : 'home'
}

function App() {
  const [locale, setLocale] = useState<Locale>('ru')
  const [activePage, setActivePage] = useState<Page>(normaliseHash)
  const active = pages.find((page) => page.id === activePage) ?? pages[0]
  useEffect(() => { const sync = () => setActivePage(normaliseHash()); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  const navigate = (page: Page) => { window.location.hash = `/${page}`; window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <main className="page-shell">
    <div className="grain" aria-hidden="true" />
    <header className="site-header">
      <button className="monogram" onClick={() => navigate('home')} aria-label="На главную">HC</button>
      <button className="identity" onClick={() => navigate('home')}>HELLEN CHARAFoulina <span>—</span> <em>art & collections</em></button>
      <nav aria-label="Основная навигация">{pages.map((page) => <button className={activePage === page.id ? 'active' : ''} key={page.id} onClick={() => navigate(page.id)}>{page.label}</button>)}</nav>
      <div className="locales" aria-label="Язык сайта">{(['ru', 'fr', 'en'] as Locale[]).map((item) => <button key={item} className={locale === item ? 'active' : ''} onClick={() => setLocale(item)}>{item.toUpperCase()}</button>)}</div>
    </header>
    {activePage === 'home' ? <>
      <section className="hero" id="top">
        <div className="hero-copy"><p className="kicker">ИСКУССТВО · СТИЛЬ · КОЛЛЕКЦИИ</p><h1>{active.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1><span className="ornament" aria-hidden="true">❦</span><p className="intro">{active.text}</p><button className="journal-link" onClick={() => navigate('journal')}><span>{translations[locale]}</span><i>↗</i></button></div>
        <figure className="hero-art"><img src="/images/art-nouveau-hero.png" alt="Женщина в зелёном родстере у здания в стиле ар-деко, ирисы и золотая модерновая рамка" /><figcaption>Art nouveau · art déco · личный архив</figcaption></figure>
        <aside className="margin-note">01 <span /> Искусство не декор. Это свидетельство времени.</aside>
      </section>
      <section className="menu-band" aria-label="Меню разделов">{pages.slice(1).map((page) => <button key={page.id} onClick={() => navigate(page.id)}>{page.label}</button>)}</section>
    </> : <section className="inner-page"><div className="inner-page-art"><img src="/images/art-nouveau-hero.png" alt="" /></div><p className="kicker">{active.index} · HELLEN CHARAFoulina</p><h1>{active.title}</h1><span className="ornament" aria-hidden="true">❦</span><p>{active.text}</p><button className="journal-link" onClick={() => navigate('home')}><span>Вернуться на главную</span><i>↗</i></button></section>}
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
