import { supabase } from '../supabaseClient';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      link: link ?? null,
      read: false,
    });
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (err) {
    console.error('Exception in createNotification:', err);
  }
}
