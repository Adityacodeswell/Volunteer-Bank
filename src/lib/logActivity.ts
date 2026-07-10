import { supabase } from '../supabaseClient';

export async function logActivity(
  profileId: string,
  actionType: string,
  description: string
) {
  await supabase.from('activity_log').insert({
    profile_id: profileId,
    action_type: actionType,
    description
  });
}
