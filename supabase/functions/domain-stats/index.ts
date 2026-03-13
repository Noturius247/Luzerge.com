import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const domainId = url.searchParams.get('domain_id')

    if (!domainId) {
      return new Response(JSON.stringify({ error: 'domain_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch domain (RLS enforces ownership)
    const { data: domain, error: domainError } = await supabase
      .from('user_domains')
      .select('id, domain, cloudflare_zone_id, cloudflare_api_token, last_purged_at')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return new Response(JSON.stringify({ error: 'Domain not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Purge history (last 10)
    const { data: history } = await supabase
      .from('cache_purge_history')
      .select('id, purge_type, urls_purged, success, created_at')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Purge count (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: purgeCount } = await supabase
      .from('cache_purge_history')
      .select('id', { count: 'exact', head: true })
      .eq('domain_id', domainId)
      .gte('created_at', since)

    // Optionally fetch Cloudflare zone analytics (last 24h)
    let cfAnalytics = null
    if (domain.cloudflare_zone_id && domain.cloudflare_api_token) {
      try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const until = new Date().toISOString()
        const cfUrl = `https://api.cloudflare.com/client/v4/zones/${domain.cloudflare_zone_id}/analytics/dashboard?since=${since24h}&until=${until}&continuous=false`

        const cfRes = await fetch(cfUrl, {
          headers: {
            'Authorization': `Bearer ${domain.cloudflare_api_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (cfRes.ok) {
          const cfData = await cfRes.json()
          const totals = cfData?.result?.totals
          if (totals) {
            const cached = totals.bandwidth?.cached ?? 0
            const total = totals.bandwidth?.all ?? 0
            cfAnalytics = {
              requests_total: totals.requests?.all ?? 0,
              requests_cached: totals.requests?.cached ?? 0,
              bandwidth_total_bytes: total,
              bandwidth_cached_bytes: cached,
              cache_hit_rate: total > 0 ? Math.round((cached / total) * 100) : 0,
              threats_total: totals.threats?.all ?? 0,
            }
          }
        }
      } catch {
        // CF analytics is optional — don't fail the whole request
      }
    }

    return new Response(JSON.stringify({
      domain: domain.domain,
      last_purged_at: domain.last_purged_at,
      purge_count_30d: purgeCount ?? 0,
      recent_history: history ?? [],
      cf_analytics: cfAnalytics,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
