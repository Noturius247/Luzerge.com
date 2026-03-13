/**
 * CORS headers for Supabase Edge Functions
 * Restricts to luzerge.com origin in production
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://luzerge.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
  'Access-Control-Max-Age': '86400',
}
