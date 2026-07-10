import { supabase } from '../supabaseClient';

export async function logActivity(
  profileId: string,
  actionType: string,
  description: string
) {
  try {
    const { error } = await supabase.from('activity_log').insert({
      profile_id: profileId,
      action_type: actionType,
      description,
    });
    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Exception in logActivity:', err);
  }
}
