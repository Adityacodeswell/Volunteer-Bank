import { supabase } from '../supabaseClient';

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link: link ?? null,
    read: false
  });
}
