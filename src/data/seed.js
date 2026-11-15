// Ukážkové dáta pre demo režim (bez Supabase). Čísla učební a vybavenie sú vymyslené.
const days = (n) => new Date(Date.now() - n * 86400000).toISOString()

export const EQUIPMENT_PRESETS = [
  { key: 'projektor', label: 'Projektor + HDMI' },
  { key: 'tabula', label: 'Tabuľa' },
  { key: 'zasuvky', label: 'Zásuvky pri laviciach' },
  { key: 'pocitace', label: 'Počítače' },
  { key: 'wifi', label: 'Wi-Fi (eduroam)' },
  { key: 'klima', label: 'Klimatizácia' }
]

// Budovy a učebne FEI TUKE podľa rozvrhového portálu KPI (data-portal.kpi.fei.tuke.sk).
// code = krátky kód budovy, je súčasťou ID učebne (L9-A534) aj odkazu v QR kóde.
// aliases = ako sa budova môže volať v importovanom rozvrhu (.ics), VEĽKÝMI písmenami.
export const BUILDINGS = [
  { code: 'L9', name: 'Letná 9', short: 'Letná 9', aliases: ['LETNÁ 9', 'LETNA 9', 'HLAVNÁ BUDOVA', 'L9'] },
  { code: 'PK6', name: 'Park Komenského 6', short: 'PK 6', aliases: ['PARK KOMENSKÉHO 6', 'PARK KOMENSKEHO 6', 'PK 6', 'PK6'] },
  { code: 'PK4', name: 'Park Komenského 4', short: 'PK 4', aliases: ['PARK KOMENSKÉHO 4', 'PARK KOMENSKEHO 4', 'PK 4', 'PK4'] },
  { code: 'V4', name: 'Vysokoškolská 4', short: 'V4', aliases: ['VYSOKOŠKOLSKÁ 4', 'VYSOKOSKOLSKA 4', 'V4'] },
  { code: 'N9', name: 'Němcovej 9', short: 'N9', aliases: ['NĚMCOVEJ 9', 'NEMCOVEJ 9', 'ZDRUŽENÉ POSLUCHÁRNE', 'ZDRUZENE POSLUCHARNE', 'BN5', 'N9', 'ZP'] }
]

// number = označenie z rozvrhu, name = názov miestnosti, floor = poschodie (ak ho poznáme)
const room = (code, number, name, floor, seats = null) => ({ id: `${code}-${number}`.toUpperCase(), building: code, number, name, floor, seats })

export const SEED = {
  v: 5,
  buildings: BUILDINGS,
  rooms: [
    room('L9', 'P25', 'Poslucháreň P25', 'blok B, prízemie'),
    room('L9', 'P27', 'Poslucháreň P27', 'blok B, prízemie'),
    room('L9', 'A204', 'Učebňa A204', 'blok A, 2. poschodie'),
    room('L9', 'A504', 'Aurora – prednášková miestnosť', 'blok A, 5. poschodie'),
    room('L9', 'A512', 'Hyperion – laboratórium IoT', 'blok A, 5. poschodie'),
    room('L9', 'A514', 'Vulcan – laboratórium', 'blok A, 5. poschodie'),
    room('L9', 'A532', 'Solaris – laboratórium', 'blok A, 5. poschodie'),
    room('L9', 'A534', 'Romulus – laboratórium CNL', 'blok A, 5. poschodie'),
    room('L9', 'A536', 'Abydos – laboratórium', 'blok A, 5. poschodie'),
    room('L9', 'B501', 'Nyx – laboratórium', 'blok B, 5. poschodie'),
    room('L9', 'B519B', 'Meridian – laboratórium CNL', 'blok B, 5. poschodie'),
    room('L9', 'B520', 'Učebňa B520', 'blok B, 5. poschodie'),
    room('L9', 'B524', 'Kronos – laboratórium', 'blok B, 5. poschodie'),
    room('L9', 'B526', 'Endor – laboratórium', 'blok B, 5. poschodie'),
    room('L9', 'B527', 'Caprica – laboratórium IoT', 'blok B, 5. poschodie'),
    room('L9', 'B529', 'Duna – laboratórium', 'blok B, 5. poschodie'),
    room('PK6', 'PC1', 'Učebňa PC1 (S02)', 'suterén'),
    room('PK6', 'PC2', 'Učebňa PC2 (S03)', 'suterén'),
    room('PK6', 'PC5', 'Poslucháreň PC5 (S07)', 'suterén'),
    room('PK6', 'PC6', 'Poslucháreň PC6 (S09)', 'suterén'),
    room('PK6', 'PC14', 'Učebňa PC14 (104)', '1. poschodie'),
    room('PK6', 'PC15', 'Učebňa PC15 (105)', '1. poschodie'),
    room('PK6', 'PC16', 'Učebňa PC16 (107)', '1. poschodie'),
    room('PK4', 'AVWS', 'Aula VW Slovakia (Aula fyziky) 105', '1. poschodie'),
    room('V4', '009', 'Učebňa V4 009', ''),
    room('V4', '102', 'Učebňa V4 102', ''),
    room('V4', '147', 'Učebňa V4 147', ''),
    room('V4', '171', 'Poslucháreň V4 171', '', 14),
    room('V4', '179', 'Laboratórium numerických metód prúdenia tekutín', '', 9),
    room('N9', 'ZP1', 'Poslucháreň ZP1 (201)', ''),
    room('N9', 'ZP4', 'Poslucháreň ZP4 (015)', '')
  ],
  // Vybavenie, tipy a hlásenia nižšie sú UKÁŽKOVÉ – len na vyskúšanie appky.
  equipment: [
    { id: 'e1', roomId: 'L9-P25', key: 'projektor', label: 'Projektor + HDMI', yes: 14, no: 0 },
    { id: 'e2', roomId: 'L9-P25', key: 'tabula', label: 'Tabuľa', yes: 9, no: 0 },
    { id: 'e3', roomId: 'L9-P25', key: 'zasuvky', label: 'Zásuvky pri laviciach', yes: 1, no: 11 },
    { id: 'e4', roomId: 'L9-P25', key: 'pocitace', label: 'Počítače', yes: 0, no: 12 },
    { id: 'e5', roomId: 'L9-P25', key: 'wifi', label: 'Wi-Fi (eduroam)', yes: 6, no: 0 },

    { id: 'e7', roomId: 'L9-A534', key: 'pocitace', label: 'Počítače', yes: 18, no: 0 },
    { id: 'e8', roomId: 'L9-A534', key: 'wifi', label: 'Wi-Fi (eduroam)', yes: 7, no: 1 },
    { id: 'e9', roomId: 'L9-A534', key: 'projektor', label: 'Projektor + HDMI', yes: 5, no: 0 },
    { id: 'e10', roomId: 'L9-A534', key: 'zasuvky', label: 'Zásuvky pri laviciach', yes: 8, no: 0 },

    { id: 'e11', roomId: 'PK6-PC1', key: 'pocitace', label: 'Počítače', yes: 9, no: 0 },
    { id: 'e12', roomId: 'PK6-PC1', key: 'klima', label: 'Klimatizácia', yes: 0, no: 4 },

    { id: 'e14', roomId: 'PK4-AVWS', key: 'projektor', label: 'Projektor + HDMI', yes: 12, no: 0 },
    { id: 'e15', roomId: 'PK4-AVWS', key: 'zasuvky', label: 'Zásuvky pri laviciach', yes: 0, no: 10 },

    { id: 'e17', roomId: 'N9-ZP1', key: 'projektor', label: 'Projektor + HDMI', yes: 21, no: 0 },
    { id: 'e18', roomId: 'N9-ZP1', key: 'zasuvky', label: 'Zásuvky pri laviciach', yes: 0, no: 15 },
    { id: 'e19', roomId: 'N9-ZP1', key: 'wifi', label: 'Wi-Fi (eduroam)', yes: 2, no: 9 }
  ],
  tips: [
    { id: 't1', roomId: 'L9-P25', text: 'Nabitý notebook – zásuvky sú len pri stenách', createdAt: days(12) },
    { id: 't2', roomId: 'L9-P25', text: 'Redukcia na HDMI, ak prezentuješ', createdAt: days(6) },
    { id: 't4', roomId: 'L9-A534', text: 'Prihlasovacie údaje do školskej siete', createdAt: days(20) },
    { id: 't5', roomId: 'PK6-PC1', text: 'Mikina – v suteréne býva chladno', createdAt: days(9) },
    { id: 't6', roomId: 'N9-ZP1', text: 'Príď skôr, predné rady sa rýchlo zaplnia', createdAt: days(4) },
    { id: 't7', roomId: 'N9-ZP1', text: 'Mobilné dáta – Wi-Fi tu takmer nejde', createdAt: days(3) }
  ],
  photos: [],
  problems: [
    { id: 2467, roomId: 'L9-P25', category: 'Projektor', text: 'Projektor bliká a občas zhasne', createdAt: days(12), same: 3, fixed: 0, resolvedAt: null },
    { id: 2391, roomId: 'L9-P25', category: 'Zásuvky', text: 'Nefunguje zásuvka pri dverách', createdAt: days(25), same: 2, fixed: 3, resolvedAt: days(16) },
    { id: 2470, roomId: 'N9-ZP1', category: 'Kúrenie, okná', text: 'Okno pri katedre sa nedá zavrieť', createdAt: days(5), same: 6, fixed: 0, resolvedAt: null }
  ],
  mine: { votes: {}, problemVotes: {} },
  nextProblemId: 2481
}

export const SAMPLE_TIMETABLE = [
  { day: 0, from: '07:30', to: '09:00', name: 'Matematika', type: 'Prednáška', roomId: 'L9-P25', week: 'kazdy' },
  { day: 0, from: '09:50', to: '11:20', name: 'Fyzika', type: 'Prednáška', roomId: 'PK4-AVWS', week: 'kazdy' },
  { day: 0, from: '11:40', to: '13:10', name: 'Angličtina', type: 'Seminár', roomId: 'PK6-PC14', week: 'kazdy' },
  { day: 1, from: '08:00', to: '09:30', name: 'Programovanie', type: 'Cvičenie', roomId: 'L9-A534', week: 'kazdy' },
  { day: 1, from: '10:00', to: '11:30', name: 'Databázy', type: 'Cvičenie', roomId: 'V4-147', week: 'parny' },
  { day: 2, from: '07:30', to: '09:00', name: 'Matematika', type: 'Prednáška', roomId: 'L9-P25', week: 'kazdy' },
  { day: 2, from: '09:50', to: '11:20', name: 'Ekonómia', type: 'Prednáška', roomId: 'N9-ZP1', week: 'kazdy' },
  { day: 3, from: '07:30', to: '09:00', name: 'Umelá inteligencia', type: 'Prednáška', roomId: 'L9-P25', week: 'kazdy' },
  { day: 3, from: '09:50', to: '11:20', name: 'Lineárna algebra', type: 'Cvičenie', roomId: 'L9-P27', week: 'kazdy' },
  { day: 3, from: '12:00', to: '13:30', name: 'Seminár AI', type: 'Seminár', roomId: 'V4-102', week: 'neparny' },
  { day: 4, from: '08:00', to: '09:30', name: 'Programovanie', type: 'Prednáška', roomId: 'N9-ZP1', week: 'kazdy' },
  { day: 4, from: '10:00', to: '11:30', name: 'Etika', type: 'Seminár', roomId: 'V4-009', week: 'kazdy' }
]
