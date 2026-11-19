# Lavica – MVP (čisté HTML, CSS a JavaScript)

Progresívna webová appka (PWA) pre študentov: zadáš rozvrh raz na semester a appka ti ukáže,
čo ťa zajtra čaká, v ktorej učebni, čo tam je, čo si zbaliť, a vieš nahlásiť problém.
Na dverách učební sú QR kódy, ktoré otvoria detail učebne.

## Spustenie u seba

Appka používa JavaScript moduly, preto ju treba otvoriť cez lokálny server (nie dvojklikom na `index.html`):

- **VS Code:** nainštaluj rozšírenie *Live Server* → pravý klik na `index.html` → *Open with Live Server*
- **alebo v termináli** v priečinku projektu:
  ```
  python -m http.server 8000
  ```
  a otvor `http://localhost:8000`

Po zmene súboru stačí obnoviť stránku (pri problémoch Ctrl+Shift+R).

## Štruktúra

```
index.html              jediná HTML stránka, do <div id="app"> sa vykresľujú obrazovky
css/styles.css          všetky štýly a farby (premenné v :root hore)
js/app.js               router: podľa adresy za # zavolá správnu obrazovku
js/ui.js                spoločné pomôcky: esc(), icon(), toast(), bottomNav(), backButton()
js/config.js            nastavenie Supabase (prázdne = demo režim)
js/screens/             jedna obrazovka = jeden súbor
  today.js              #/            rozvrh na zajtra, čo si zbaliť
  timetable.js          #/rozvrh      zadanie rozvrhu (.ics import, ručne)
  rooms.js              #/ucebne      zoznam učební podľa budov
  room.js               #/u/L9-P25    detail učebne
  addinfo.js            #/u/…/doplnit doplniť vybavenie, fotky, tip
  report.js             #/u/…/nahlasit nahlásiť problém
  scan.js               #/scan        QR skener
  labels.js             #/stitky      tlač QR štítkov na dvere
js/data/
  api.js                vyberie zdroj dát (Supabase alebo demo)
  localApi.js           demo režim – dáta v prehliadači (localStorage)
  supabaseApi.js        ostrý režim – zdieľaná databáza
  seed.js               BUDOVY, UČEBNE a ukážkové dáta  ← sem pridávaj učebne
  timetable.js          rozvrh študenta (len v jeho telefóne)
  view.js               pravidlá: stav problému, čo si zbaliť
  rooms.js              ID učebne = kód budovy + číslo (L9-A534)
js/lib/                 dátumy, import .ics, zmenšovanie fotiek, úložisko
vendor/                 knižnice (Supabase, čítanie a generovanie QR) – NEUPRAVOVAŤ
sw.js                   service worker (offline režim)
manifest.webmanifest    názov, ikona a farby appky na ploche mobilu
supabase/schema.sql     databáza pre Supabase
```
