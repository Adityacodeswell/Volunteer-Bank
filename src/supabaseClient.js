import { createClient } from "@supabase/supabase-js";

// =========================================================================
// SUPABASE CONFIGURATION
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// =========================================================================

// --- PASTE YOUR SUPABASE URL HERE ---
const SUPABASE_URL = "https://ogmdudmlxytnucpbucxk.supabase.co/rest/v1/";

// --- PASTE YOUR SUPABASE ANON/PUBLIC KEY HERE ---
const SUPABASE_PUBLIC_KEY = "sb_publishable_vcBV6IFYyRjTNUaWoWfXFQ_R-gFbQAy";

// Create and export the single Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
