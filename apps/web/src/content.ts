export type Locale = 'ru' | 'fr' | 'en'
export type Page = 'home' | 'works' | 'collections' | 'about' | 'journal' | 'contacts'

export const pages: Array<{ id: Page; index: string }> = [
  { id: 'home', index: '01' },
  { id: 'works', index: '02' },
  { id: 'collections', index: '03' },
  { id: 'about', index: '04' },
  { id: 'journal', index: '05' },
  { id: 'contacts', index: '06' },
]

export type SiteContentRow = {
  page: Page
  locale: Locale
  nav_label: string
  title: string
  body: string
  image_url: string
  image_alt: string
  updated_at?: string
}

export const copy: Record<Locale, {
  tagline: string
  navigationLabel: string
  languageLabel: string
  homeAria: string
  siteTitle: string
  caption: string
  imageAlt: string
  backToHome: string
  pages: Record<Page, { label: string; title: string; text: string }>
}> = {
  ru: {
    tagline: 'ИСКУССТВО И КОЛЛЕКЦИИ', navigationLabel: 'Основная навигация', languageLabel: 'Язык сайта', homeAria: 'На главную',
    siteTitle: 'Hellen Charafoulina — Искусство и коллекции', caption: 'Ар-нуво · ар-деко · личный архив',
    imageAlt: 'Женщина в зелёном родстере у здания в стиле ар-деко, ирисы и золотая модерновая рамка', backToHome: 'Вернуться на главную',
    pages: {
      home: { label: 'ГЛАВНАЯ', title: 'Главная', text: 'От текучей линии ар-нуво до безупречной геометрии ар-деко: здесь предметы читаются как портреты своего времени.' },
      works: { label: 'РАБОТЫ', title: 'Работы', text: 'Авторские исследования, эссе и визуальные истории о стиле, формах и предметах искусства.' },
      collections: { label: 'КОЛЛЕКЦИИ', title: 'Коллекции', text: 'Отобранные предметы, редкие издания и частные собрания с вниманием к истории и происхождению.' },
      about: { label: 'О ХУДОЖНИЦЕ', title: 'О художнице', text: 'Личный взгляд на искусство, где исторический контекст встречается с интуицией коллекционера.' },
      journal: { label: 'ЖУРНАЛ', title: 'Журнал', text: 'Заметки о декоративном искусстве, архитектуре, антиквариате и людях, создавших язык эпохи.' },
      contacts: { label: 'КОНТАКТЫ', title: 'Контакты', text: 'Для предложений о проектах, публикациях и частных коллекциях.' },
    },
  },
  fr: {
    tagline: 'ART & COLLECTIONS', navigationLabel: 'Navigation principale', languageLabel: 'Langue du site', homeAria: 'Accueil',
    siteTitle: 'Hellen Charafoulina — Art et collections', caption: 'Art nouveau · Art déco · archives personnelles',
    imageAlt: 'Une femme dans un roadster vert devant un bâtiment Art déco, des iris et un cadre doré Art nouveau', backToHome: 'Retour à l’accueil',
    pages: {
      home: { label: 'ACCUEIL', title: 'Accueil', text: 'De la ligne fluide de l’Art nouveau à la géométrie précise de l’Art déco, les objets racontent leur époque.' },
      works: { label: 'PROJETS', title: 'Projets', text: 'Recherches, essais et récits visuels autour du style, des formes et des objets d’art.' },
      collections: { label: 'COLLECTIONS', title: 'Collections', text: 'Objets choisis, éditions rares et collections privées, présentés avec soin et sens de leur provenance.' },
      about: { label: 'À PROPOS', title: 'À propos de l’artiste', text: 'Un regard personnel sur l’art, entre contexte historique et intuition de collectionneuse.' },
      journal: { label: 'JOURNAL', title: 'Journal', text: 'Notes sur les arts décoratifs, l’architecture, les antiquités et les créateurs d’une époque.' },
      contacts: { label: 'CONTACT', title: 'Contact', text: 'Pour parler de projets, de publications et de collections privées.' },
    },
  },
  en: {
    tagline: 'ART & COLLECTIONS', navigationLabel: 'Main navigation', languageLabel: 'Site language', homeAria: 'Home',
    siteTitle: 'Hellen Charafoulina — Art and Collections', caption: 'Art Nouveau · Art Deco · personal archive',
    imageAlt: 'A woman in a green roadster beside an Art Deco building, irises and a gilded Art Nouveau frame', backToHome: 'Back to home',
    pages: {
      home: { label: 'HOME', title: 'Home', text: 'From the flowing line of Art Nouveau to the precise geometry of Art Deco, objects reveal the character of their time.' },
      works: { label: 'PROJECTS', title: 'Projects', text: 'Original research, essays and visual stories about style, form and works of art.' },
      collections: { label: 'COLLECTIONS', title: 'Collections', text: 'Selected objects, rare editions and private collections, presented with care for their history and provenance.' },
      about: { label: 'ABOUT', title: 'About the artist', text: 'A personal view of art, where historical context meets the intuition of a collector.' },
      journal: { label: 'JOURNAL', title: 'Journal', text: 'Notes on decorative arts, architecture, antiques and the people who shaped an era.' },
      contacts: { label: 'CONTACT', title: 'Contact', text: 'For enquiries about projects, publications and private collections.' },
    },
  },
}

export function defaultSiteContent(): SiteContentRow[] {
  return (Object.keys(copy) as Locale[]).flatMap((locale) => pages.map(({ id }) => ({
    page: id,
    locale,
    nav_label: copy[locale].pages[id].label,
    title: id === 'home' ? 'Hellen Charafoulina' : copy[locale].pages[id].title,
    body: id === 'home' ? '' : copy[locale].pages[id].text,
    image_url: '/images/art-nouveau-hero.png',
    image_alt: copy[locale].imageAlt,
  })))
}
