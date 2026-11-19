import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js'
import { localApi } from './localApi.js'
import { createSupabaseApi } from './supabaseApi.js'

export const api = SUPABASE_URL && SUPABASE_ANON_KEY ? createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY) : localApi
