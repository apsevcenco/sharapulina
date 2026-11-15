import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Locale = 'ru' | 'fr' | 'en'

const copy: Record<Locale, { kicker: string; title: string; statement: string; cta: string }> = {
  ru: {
    kicker: 'ЗАПИСКИ ОБ ИСКУССТВЕ И КОЛЛЕКЦИОНИРОВАНИИ',
    title: 'Искусство требует\nмедленного взгляда.',
    statement: 'От текучей линии ар-нуво до безупречной геометрии ар-деко: здесь предметы читаются как портреты своего времени.',
    cta: 'Открыть журнал',
  },
  fr: {
    kicker: 'CARNETS D’ART ET DE COLLECTION',
    title: 'L’art demande\nun regard lent.',
    statement: 'De la ligne mouvante de l’Art nouveau à la géométrie de l’Art déco, chaque objet raconte son époque.',
    cta: 'Ouvrir le journal',
  },
  en: {
    kicker: 'NOTES ON ART AND COLLECTING',
    title: 'Art asks for\na slower gaze.',
    statement: 'From Art Nouveau’s living line to Art Deco’s poised geometry, each object is read as a portrait of its era.',
    cta: 'Open the journal',
  },
}

function App() {
  const [locale, setLocale] = useState<Locale>('ru')
  const text = copy[locale]

  return (
    <main className="page-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <a className="monogram" href="#top" aria-label="На главную">ES</a>
          <p className="identity">ELEN SHARAFULLINA <span>—</span> <em>arts, objects & provenance</em></p>
        <nav aria-label="Основная навигация">
          <a href="#journal">Журнал</a>
          <a href="#archive">Архив</a>
          <a href="#about">Об авторе</a>
        </nav>
        <div className="locales" aria-label="Язык сайта">
          {(['ru', 'fr', 'en'] as Locale[]).map((item) => (
            <button key={item} className={locale === item ? 'active' : ''} onClick={() => setLocale(item)}>
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker">{text.kicker}</p>
          <h1>{text.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
          <span className="ornament" aria-hidden="true">❦</span>
          <p className="intro">{text.statement}</p>
          <a className="journal-link" href="#journal"><span>{text.cta}</span><i>↗</i></a>
        </div>
        <figure className="hero-art">
          <img src="/images/art-nouveau-hero.png" alt="Ар-нуво натюрморт с редкими книгами, ирисами и винтажным календарём" />
          <figcaption>Art nouveau · art déco · личный архив</figcaption>
        </figure>
        <aside className="margin-note">01 <span /> Искусство не декор. Это свидетельство времени.</aside>
      </section>

      <section className="manifesto" id="journal">
        <p>Узнавать подлинное — значит замечать линию, свет, происхождение и руку мастера.</p>
        <div className="disciplines">
          <span>ART NOUVEAU</span><span>ART DÉCO</span><span>OBJETS D’ART</span><span>PROVENANCE</span>
        </div>
      </section>

      <section className="editorial-grid" aria-label="Разделы сайта">
        <a className="editorial-card journal-card" href="#journal">
          <span>01 · JOURNAL</span>
          <strong>Истории вещей,<br />которые пережили<br />своё время.</strong>
          <i>Открыть записи ↗</i>
        </a>
        <a className="editorial-card archive-card" id="archive" href="#archive">
          <span>02 · ARCHIVE</span>
          <strong>Личный архив:<br />стили, мастера,<br />редкие предметы.</strong>
          <i>Перейти в архив ↗</i>
        </a>
        <a className="editorial-card about-card" id="about" href="#about">
          <span>03 · ABOUT</span>
          <strong>Взгляд автора:<br />искусство — это<br />знание деталей.</strong>
          <i>Об авторе ↗</i>
        </a>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
