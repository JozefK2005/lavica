import { createClient } from '../../vendor/supabase.js'
import { resizeImage } from '../lib/image.js'
import { equipmentStatus, problemStatus } from './view.js'

export function createSupabaseApi(url, anonKey) {
  const sb = createClient(url, anonKey, { auth: { persistSession: true } })
  let userIdPromise = null

  function userId() {
    userIdPromise ||= (async () => {
      const { data } = await sb.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: signed, error } = await sb.auth.signInAnonymously()
      if (error) throw error
      return signed.user.id
    })().catch((e) => {
      userIdPromise = null
      throw e
    })
    return userIdPromise
  }

  const check = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }

  const publicUrl = (path) => sb.storage.from('photos').getPublicUrl(path).data.publicUrl

  return {
    mode: 'supabase',

    async listBuildings() {
      const rows = check(await sb.from('buildings').select('code, name, short, aliases').order('sort'))
      return rows.map((b) => ({ ...b, aliases: b.aliases || [] }))
    },

    async listRooms() {
      const rows = check(
        await sb
          .from('rooms')
          .select('id, building, number, name, floor, seats, buildings(name, short), problems(id, resolved_at), equipment(id), tips(id), photos(id)')
          .order('building')
          .order('number')
      )
      return rows.map((r) => ({
        id: r.id,
        building: r.building,
        number: r.number,
        name: r.name,
        buildingName: r.buildings?.name ?? r.building,
        buildingShort: r.buildings?.short ?? r.building,
        floor: r.floor,
        seats: r.seats,
        openProblems: r.problems.filter((p) => !p.resolved_at).length,
        hasInfo: r.equipment.length + r.tips.length + r.photos.length > 0
      }))
    },

    async getRoom(id) {
      const me = await userId()
      const r = check(
        await sb
          .from('rooms')
          .select(
            'id, building, number, name, floor, seats, buildings(name, short), equipment(id, key, label, equipment_votes(user_id, value)), tips(id, text, created_at), photos(id, path, created_at), problems(id, category, text, created_at, resolved_at, user_id, problem_votes(user_id, kind))'
          )
          .eq('id', String(id).toUpperCase())
          .maybeSingle()
      )
      if (!r) return null
      const equipment = r.equipment.map((e) => {
        const yes = e.equipment_votes.filter((v) => v.value === 'ano').length
        const no = e.equipment_votes.filter((v) => v.value === 'nie').length
        const myVote = e.equipment_votes.find((v) => v.user_id === me)?.value ?? null
        return { id: e.id, key: e.key, label: e.label, yes, no, status: equipmentStatus(yes, no), count: Math.max(yes, no), myVote }
      })
      const problems = r.problems
        .map((p) => {
          const votes = p.problem_votes
          const view = {
            id: p.id,
            category: p.category,
            text: p.text,
            createdAt: p.created_at,
            resolvedAt: p.resolved_at,
            same: 1 + votes.filter((v) => v.kind === 'same').length,
            fixed: votes.filter((v) => v.kind === 'fixed').length,
            mySame: votes.some((v) => v.kind === 'same' && v.user_id === me),
            myFixed: votes.some((v) => v.kind === 'fixed' && v.user_id === me),
            mine: p.user_id === me
          }
          return { ...view, status: problemStatus(view) }
        })
        .sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || new Date(b.createdAt) - new Date(a.createdAt))
      const tips = r.tips.map((t) => ({ id: t.id, text: t.text, createdAt: t.created_at })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const photos = r.photos.map((p) => ({ id: p.id, url: publicUrl(p.path), createdAt: p.created_at }))
      const updatedAt = [...tips.map((t) => t.createdAt), ...photos.map((p) => p.createdAt)].sort().pop() ?? null
      return {
        id: r.id,
        building: r.building,
        number: r.number,
        name: r.name,
        buildingName: r.buildings?.name ?? r.building,
        buildingShort: r.buildings?.short ?? r.building,
        floor: r.floor,
        seats: r.seats,
        equipment,
        problems,
        tips,
        photos,
        updatedAt
      }
    },

    async voteEquipment(equipmentId, value) {
      const me = await userId()
      if (!value) {
        check(await sb.from('equipment_votes').delete().eq('equipment_id', equipmentId).eq('user_id', me))
      } else {
        check(await sb.from('equipment_votes').upsert({ equipment_id: equipmentId, user_id: me, value }))
      }
      return true
    },

    async addEquipment(roomId, label, key = 'vlastne') {
      const me = await userId()
      const row = check(await sb.from('equipment').insert({ room_id: roomId, label, key, user_id: me }).select('id').single())
      return row.id
    },

    async addTip(roomId, text) {
      const me = await userId()
      check(await sb.from('tips').insert({ room_id: roomId, text, user_id: me }))
      return true
    },

    async addPhoto(roomId, file) {
      const me = await userId()
      const blob = await resizeImage(file)
      const path = `${roomId}/${crypto.randomUUID()}.jpg`
      check(await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' }))
      check(await sb.from('photos').insert({ room_id: roomId, path, user_id: me }))
      return true
    },

    async addProblem(roomId, category, text, file) {
      const me = await userId()
      let photo_path = null
      if (file) {
        const blob = await resizeImage(file)
        photo_path = `problems/${crypto.randomUUID()}.jpg`
        check(await sb.storage.from('photos').upload(photo_path, blob, { contentType: 'image/jpeg' }))
      }
      const row = check(await sb.from('problems').insert({ room_id: roomId, category, text, photo_path, user_id: me }).select('id').single())
      return row.id
    },

    async setProblemVote(problemId, kind, on) {
      const me = await userId()
      if (on) check(await sb.from('problem_votes').upsert({ problem_id: problemId, user_id: me, kind }))
      else check(await sb.from('problem_votes').delete().eq('problem_id', problemId).eq('user_id', me).eq('kind', kind))
      return true
    },

    async resetDemo() {
      return false
    }
  }
}
