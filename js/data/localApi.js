import { SEED } from './seed.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { blobToDataUrl, resizeImage } from '../lib/image.js'
import { equipmentStatus, problemStatus, RESOLVE_AFTER } from './view.js'

const KEY = 'ucebne:data:v2'
let db = null

function load() {
  if (db) return db
  const stored = readJSON(KEY, null)
  db = stored && stored.v === SEED.v ? stored : structuredClone(SEED)
  if (!stored) persist()
  return db
}

function persist() {
  const ok = writeJSON(KEY, db)
  if (!ok) console.warn('Dáta sa uložili len do pamäte (úložisko prehliadača nie je dostupné alebo je plné).')
}

const delay = (v) => new Promise((r) => setTimeout(() => r(v), 60))

function roomView(id) {
  const d = load()
  const room = d.rooms.find((r) => r.id === id)
  if (!room) return null
  const equipment = d.equipment
    .filter((e) => e.roomId === id)
    .map((e) => {
      const my = d.mine.votes[e.id]
      const yes = e.yes + (my === 'ano' ? 1 : 0)
      const no = e.no + (my === 'nie' ? 1 : 0)
      const status = equipmentStatus(yes, no)
      return { id: e.id, key: e.key, label: e.label, yes, no, status, count: Math.max(yes, no), myVote: my ?? null }
    })
  const problems = d.problems
    .filter((p) => p.roomId === id)
    .map((p) => {
      const mv = d.mine.problemVotes[p.id] || {}
      const view = {
        id: p.id,
        category: p.category,
        text: p.text,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
        same: p.same + (mv.same ? 1 : 0),
        fixed: p.fixed + (mv.fixed ? 1 : 0),
        mySame: !!mv.same,
        myFixed: !!mv.fixed,
        mine: !!p.reportedByMe
      }
      return { ...view, status: problemStatus(view) }
    })
    .sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || new Date(b.createdAt) - new Date(a.createdAt))
  const tips = d.tips.filter((t) => t.roomId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const photos = d.photos.filter((p) => p.roomId === id).map((p) => ({ id: p.id, url: p.dataUrl }))
  const updates = [...tips.map((t) => t.createdAt), ...d.photos.filter((p) => p.roomId === id).map((p) => p.createdAt)]
  const updatedAt = updates.sort().pop() ?? null
  const b = d.buildings.find((x) => x.code === room.building)
  return { ...room, buildingName: b?.name ?? room.building, buildingShort: b?.short ?? room.building, equipment, problems, tips, photos, updatedAt }
}

export const localApi = {
  mode: 'demo',

  async listBuildings() {
    return delay(load().buildings)
  },

  async listRooms() {
    const d = load()
    return delay(
      d.rooms.map((r) => {
        const v = roomView(r.id)
        return {
          ...r,
          buildingName: v.buildingName,
          buildingShort: v.buildingShort,
          openProblems: v.problems.filter((p) => p.status !== 'resolved').length,
          hasInfo: v.equipment.length > 0 || v.tips.length > 0 || v.photos.length > 0
        }
      })
    )
  },

  async getRoom(id) {
    return delay(roomView(String(id).toUpperCase()))
  },

  async voteEquipment(equipmentId, value) {
    const d = load()
    if (value) d.mine.votes[equipmentId] = value
    else delete d.mine.votes[equipmentId]
    persist()
    return delay(true)
  },

  async addEquipment(roomId, label, key = 'vlastne') {
    const d = load()
    const id = 'e' + Date.now().toString(36)
    d.equipment.push({ id, roomId, key, label, yes: 0, no: 0 })
    persist()
    return delay(id)
  },

  async addTip(roomId, text) {
    const d = load()
    d.tips.push({ id: 't' + Date.now().toString(36), roomId, text, createdAt: new Date().toISOString() })
    persist()
    return delay(true)
  },

  async addPhoto(roomId, file) {
    const d = load()
    const blob = await resizeImage(file, 900, 0.7)
    const dataUrl = await blobToDataUrl(blob)
    d.photos.push({ id: 'p' + Date.now().toString(36), roomId, dataUrl, createdAt: new Date().toISOString() })
    persist()
    return true
  },

  async addProblem(roomId, category, text, file) {
    const d = load()
    const id = d.nextProblemId++
    let photo = null
    if (file) photo = await blobToDataUrl(await resizeImage(file, 900, 0.7))
    d.problems.push({ id, roomId, category, text, photo, createdAt: new Date().toISOString(), same: 1, fixed: 0, resolvedAt: null, reportedByMe: true })
    persist()
    return delay(id)
  },

  async setProblemVote(problemId, kind, on) {
    const d = load()
    const mv = (d.mine.problemVotes[problemId] ||= {})
    mv[kind] = on
    const p = d.problems.find((x) => x.id === problemId)
    if (p && kind === 'fixed') {
      const fixed = p.fixed + (mv.fixed ? 1 : 0)
      p.resolvedAt = fixed >= RESOLVE_AFTER ? new Date().toISOString() : null
    }
    persist()
    return delay(true)
  },

  async resetDemo() {
    db = structuredClone(SEED)
    persist()
    return true
  }
}
