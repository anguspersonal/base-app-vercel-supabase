import type { SupabaseClient } from '@supabase/supabase-js'

export async function getProfile(userId: string, client: SupabaseClient) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createProfile(userId: string, username: string, client: SupabaseClient) {
  const { data, error } = await client
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(
  userId: string,
  updates: { username?: string },
  client: SupabaseClient
) {
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
