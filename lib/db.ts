import { supabase } from './supabaseClient'

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function createProfile(userId: string, username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: { username?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
