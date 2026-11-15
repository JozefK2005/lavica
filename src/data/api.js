// Ak sú vyplnené premenné VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY,
// appka beží nad Supabase. Inak sa spustí demo režim s dátami v prehliadači.
import { localApi } from './localApi.js'
import { createSupabaseApi } from './supabaseApi.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const api = url && key ? createSupabaseApi(url, key) : localApi
