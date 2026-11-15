# Lavica – MVP (PWA)

Progresívna webová appka pre študentov: zadáš rozvrh raz na semester a appka ti ukáže,
čo ťa zajtra čaká, v ktorej učebni, čo tam je, čo si zbaliť, a vieš nahlásiť problém.
Na dverách učební sú QR kódy, ktoré otvoria detail učebne.

## Budovy a učebne

Učebne sú rozdelené podľa budov (Letná 9, Park Komenského 4 a 6, Vysokoškolská 4, Němcovej 9). ID učebne je kód budovy + číslo,
napr. `L9-A534` alebo `V4-147`, takže rovnaké číslo môže byť vo viacerých budovách.
Budova sa vyberá pri zadávaní hodiny, v zozname učební, pri ručnom hľadaní na obrazovke skenovania
aj pri tlači QR štítkov. Pri importe `.ics` sa budova rozpozná z miesta konania podľa `aliases`
(napr. „L9A 204“ → `L9-A204`, „V4 147“ → `V4-147`); ak ju appka nespozná, hodinu označí „Skontroluj budovu“.

Novú budovu pridáš v demo režime do `BUILDINGS` v `src/data/seed.js`, v Supabase príkazom
na konci `supabase/schema.sql`.

## Čo MVP vie

| Obrazovka | Funkcie |
|---|---|
| **Rozvrh** (`#/`) | Otvorí sa na zajtrajšok (cez víkend na pondelok), prepínanie dní, párny/nepárny týždeň, zoznam „čo si zbaliť“ z tipov učební (odškrtávanie sa pamätá), upozornenie na nahlásené problémy |
| **Zadať rozvrh** (`#/rozvrh`) | Import `.ics` (export z kalendára alebo školského systému), ukážkový rozvrh, ručné pridanie/odobranie hodiny s kontrolou údajov |
| **Učebne** (`#/ucebne`) | Zoznam a vyhľadávanie učební, počet otvorených problémov |
| **Detail učebne** (`#/u/L9-108`) | Fotky, vybavenie s počtom potvrdení a tlačidlom Potvrdiť, tipy „na čo sa pripraviť“, problémy s +1 a „Už funguje“ (3× = vyriešené) |
| **Doplniť info** | Fotky (zmenšia sa pred uložením), Áno/Nie/? pri vybavení, vlastná vec, tip |
| **Nahlásiť problém** | Kategórie, ponuka existujúceho hlásenia (+1 namiesto duplicity), popis, fotka |
| **Skenovať QR** (`#/scan`) | Kamera + čítanie QR (jsQR), baterka ak ju telefón podporuje, ručné zadanie čísla, nedávne učebne |
| **QR štítky** (`#/stitky`) | Vygeneruje a vytlačí štítky na dvere. QR obsahuje odkaz `…/#/u/L9-108`, takže funguje aj obyčajným fotoaparátom bez appky |

PWA: inštalácia na plochu, offline režim (service worker), ikony, manifest.

## Spustenie

```bash
npm install
npm run dev        # vývoj na http://localhost:5173
npm run build      # produkčný build do dist/
npm run preview    # skúška buildu
```

Bez nastavenia beží **demo režim**: ukážkové učebne a všetky zmeny sa ukladajú len v prehliadači.

## Napojenie na Supabase (zdieľané dáta medzi študentmi)

1. Vytvor projekt na supabase.com.
2. Authentication → Sign In / Providers → zapni **Allow anonymous sign-ins**
   (študent sa nemusí registrovať, ale hlasy sa dajú priradiť jednému zariadeniu).
3. SQL Editor → spusti `supabase/schema.sql` (tabuľky, pravidlá RLS, úložisko fotiek, ukážkové učebne).
4. Skopíruj `.env.example` ako `.env` a doplň `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
5. `npm run build` – appka sa automaticky prepne na Supabase.

Rozvrh zostáva aj vtedy len v telefóne študenta (osobný údaj, na server ho netreba).

## Nasadenie na vlastný server (napr. Hetzner)

Obsah `dist/` je statický web. Stačí ho servírovať cez HTTPS (service worker a kamera HTTPS vyžadujú), napr. Caddy:

```
ucebne.tvojadomena.sk {
    root * /var/www/ucebne
    file_server
}
```

## Štruktúra

```
src/
  main.jsx            routy (HashRouter – funguje na akomkoľvek statickom hostingu)
  ui.jsx              ikony, navigácia, toasty, načítavanie
  styles.css          farby a komponenty (paleta #2A2A72 #009FFD #FFA400 #232528 #EAF6FF)
  data/api.js         výber dátovej vrstvy (Supabase alebo demo)
  data/localApi.js    demo režim (localStorage)
  data/supabaseApi.js ostrý režim
  data/view.js        spoločné pravidlá (stav problému, čo si zbaliť)
  data/timetable.js   rozvrh v zariadení, párny/nepárny týždeň
  lib/ics.js          import .ics
  screens/            obrazovky
supabase/schema.sql   databáza
```

## Čo zatiaľ chýba (ďalšie kroky)

- Rozpoznanie rozvrhu z fotky (OCR) – teraz je import cez `.ics`.
- Push notifikácie (večerná pripomienka, „tvoj problém je opravený“) – potrebujú server na odosielanie.
- Moderovanie: rozhranie na skrytie fotiek/tipov (v DB je pripravený stĺpec `photos.hidden`).
- Prehľad hlásení pre prevádzku/fakultu (platiaci zákazník podľa Business Model Canvas).
- Navigácia k učebni (mapa budovy).
