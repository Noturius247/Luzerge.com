/**
 * Luzerge — Dashboard JavaScript
 * Handles: domain CRUD, cache purge, stats, purge history
 */

'use strict'

const EDGE_BASE = 'https://byzuraeyhrxxpztredri.supabase.co/functions/v1'

let currentUser = null
let selectedDomainId = null
let domainToDelete = null

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth()
  if (!session) return

  currentUser = session.user

  // Show user email in nav
  const navUser = document.getElementById('navUser')
  if (navUser) navUser.textContent = currentUser.email

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', signOut)

  // Load domains
  await loadDomains()

  // Add domain form
  document.getElementById('addDomainForm')?.addEventListener('submit', handleAddDomain)

  // Close detail
  document.getElementById('closeDetailBtn')?.addEventListener('click', closeDetail)

  // Purge tabs
  document.querySelectorAll('.purge-tab').forEach(tab => {
    tab.addEventListener('click', () => switchPurgeTab(tab.dataset.tab))
  })

  // Purge actions
  document.getElementById('purgeEverythingBtn')?.addEventListener('click', () => handlePurge('everything'))
  document.getElementById('purgeUrlsBtn')?.addEventListener('click', () => handlePurge('urls'))

  // Delete modal
  document.getElementById('deleteCancelBtn')?.addEventListener('click', closeDeleteModal)
  document.getElementById('deleteConfirmBtn')?.addEventListener('click', confirmDelete)
})

// ─── Load domains ─────────────────────────────────────────────────────────────

async function loadDomains() {
  const list = document.getElementById('domainsList')
  const loading = document.getElementById('domainsLoading')
  const empty = document.getElementById('domainsEmpty')
  const count = document.getElementById('domainCount')

  loading.hidden = false
  list.innerHTML = ''
  empty.hidden = true

  const { data: domains, error } = await _supabase
    .from('user_domains')
    .select('id, domain, status, last_purged_at, created_at')
    .order('created_at', { ascending: false })

  loading.hidden = true

  if (error) {
    list.innerHTML = `<p style="color:#f87171">Failed to load domains: ${error.message}</p>`
    return
  }

  count.textContent = `${domains.length} domain${domains.length !== 1 ? 's' : ''}`

  if (!domains.length) {
    empty.hidden = false
    return
  }

  list.innerHTML = domains.map(d => `
    <div class="domain-card" data-id="${d.id}" role="button" tabindex="0" aria-label="View ${d.domain}">
      <div class="domain-card__left">
        <span class="domain-card__name">${escHtml(d.domain)}</span>
        <span class="domain-card__meta">
          Added ${formatDate(d.created_at)}
          ${d.last_purged_at ? `· Last purged ${formatDate(d.last_purged_at)}` : ''}
        </span>
      </div>
      <div class="domain-card__actions">
        <span class="status-badge status-badge--${d.status}">${d.status}</span>
        <button class="btn btn--outline btn--sm" data-action="view" data-id="${d.id}">View</button>
        <button class="btn btn--danger btn--sm" data-action="delete" data-id="${d.id}" data-domain="${escHtml(d.domain)}">Remove</button>
      </div>
    </div>
  `).join('')

  // Events
  list.querySelectorAll('[data-action="view"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      openDetail(btn.dataset.id)
    })
  })
  list.querySelectorAll('.domain-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id))
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openDetail(card.dataset.id) })
  })
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      openDeleteModal(btn.dataset.id, btn.dataset.domain)
    })
  })
}

// ─── Add domain ───────────────────────────────────────────────────────────────

async function handleAddDomain(e) {
  e.preventDefault()

  const btn = document.getElementById('addDomainBtn')
  const errEl = document.getElementById('addDomainError')
  errEl.hidden = true

  const domain = document.getElementById('inputDomain').value.trim()
    .replace(/^https?:\/\//i, '')   // strip protocol
    .replace(/^www\./i, '')          // strip www
    .replace(/\/.*$/, '')            // strip path
    .toLowerCase()
  const zoneId = document.getElementById('inputZoneId').value.trim()
  const apiToken = document.getElementById('inputApiToken').value.trim()

  if (!domain || !zoneId || !apiToken) {
    showAddError('All three fields are required.')
    return
  }

  btn.disabled = true
  btn.textContent = 'Adding…'

  const { error } = await _supabase.from('user_domains').insert({
    user_id: currentUser.id,
    domain,
    cloudflare_zone_id: zoneId,
    cloudflare_api_token: apiToken,
  })

  btn.disabled = false
  btn.textContent = 'Add Domain →'

  if (error) {
    showAddError(error.message.includes('unique') ? `${domain} is already added.` : error.message)
    return
  }

  // Clear form
  document.getElementById('addDomainForm').reset()
  await loadDomains()
}

function showAddError(msg) {
  const el = document.getElementById('addDomainError')
  el.textContent = msg
  el.hidden = false
}

// ─── Domain detail ────────────────────────────────────────────────────────────

async function openDetail(domainId) {
  selectedDomainId = domainId
  document.getElementById('detailPanel').hidden = false
  document.getElementById('detailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Reset purge alerts
  document.getElementById('purgeSuccess').hidden = true
  document.getElementById('purgeError').hidden = true

  // Get domain name for title
  const { data: domain } = await _supabase
    .from('user_domains')
    .select('domain')
    .eq('id', domainId)
    .single()

  if (domain) {
    document.getElementById('detailTitle').textContent = domain.domain
  }

  // Load stats
  await loadStats(domainId)
}

function closeDetail() {
  document.getElementById('detailPanel').hidden = true
  selectedDomainId = null
}

async function loadStats(domainId) {
  // Reset
  ;['statRequests','statCacheRate','statThreats','statPurges'].forEach(id => {
    document.getElementById(id).textContent = '…'
  })
  document.getElementById('historyLoading').hidden = false
  document.getElementById('historyTable').hidden = true
  document.getElementById('historyEmpty').hidden = true

  const session = await getSession()
  if (!session) return

  const res = await fetch(`${EDGE_BASE}/domain-stats?domain_id=${domainId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    ;['statRequests','statCacheRate','statThreats','statPurges'].forEach(id => {
      document.getElementById(id).textContent = '—'
    })
    document.getElementById('historyLoading').hidden = true
    document.getElementById('historyEmpty').hidden = false
    return
  }

  const data = await res.json()

  // CF analytics
  if (data.cf_analytics) {
    const a = data.cf_analytics
    document.getElementById('statRequests').textContent = fmtNum(a.requests_total)
    document.getElementById('statCacheRate').textContent = `${a.cache_hit_rate}%`
    document.getElementById('statThreats').textContent = fmtNum(a.threats_total)
  } else {
    document.getElementById('statRequests').textContent = 'N/A'
    document.getElementById('statCacheRate').textContent = 'N/A'
    document.getElementById('statThreats').textContent = 'N/A'
  }

  document.getElementById('statPurges').textContent = fmtNum(data.purge_count_30d)

  // History
  document.getElementById('historyLoading').hidden = true
  const history = data.recent_history ?? []

  if (!history.length) {
    document.getElementById('historyEmpty').hidden = false
    return
  }

  const tbody = document.getElementById('historyBody')
  tbody.innerHTML = history.map(h => `
    <tr>
      <td>${formatDate(h.created_at)}</td>
      <td>${h.purge_type === 'everything' ? 'Everything' : `${(h.urls_purged ?? []).length} URL(s)`}</td>
      <td>
        <span class="status-badge status-badge--${h.success ? 'active' : 'error'}">
          ${h.success ? 'OK' : 'Failed'}
        </span>
      </td>
    </tr>
  `).join('')
  document.getElementById('historyTable').hidden = false
}

// ─── Purge ────────────────────────────────────────────────────────────────────

function switchPurgeTab(tab) {
  document.querySelectorAll('.purge-tab').forEach(t => t.classList.remove('purge-tab--active'))
  document.querySelector(`[data-tab="${tab}"]`).classList.add('purge-tab--active')
  document.getElementById('purgeEverything').hidden = tab !== 'everything'
  document.getElementById('purgeUrls').hidden = tab !== 'urls'
}

async function handlePurge(type) {
  if (!selectedDomainId) return

  const successEl = document.getElementById('purgeSuccess')
  const errorEl = document.getElementById('purgeError')
  successEl.hidden = true
  errorEl.hidden = true

  const btnId = type === 'everything' ? 'purgeEverythingBtn' : 'purgeUrlsBtn'
  const btn = document.getElementById(btnId)
  btn.disabled = true
  btn.textContent = 'Purging…'

  const body = { domain_id: selectedDomainId, purge_type: type }

  if (type === 'urls') {
    const raw = document.getElementById('urlsToPurge').value
    const urls = raw.split('\n').map(u => u.trim()).filter(Boolean)
    if (!urls.length) {
      errorEl.textContent = 'Enter at least one URL.'
      errorEl.hidden = false
      btn.disabled = false
      btn.textContent = 'Purge Selected URLs'
      return
    }
    body.urls = urls
  }

  const session = await getSession()
  const res = await fetch(`${EDGE_BASE}/purge-cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  btn.disabled = false
  btn.textContent = type === 'everything' ? 'Purge Everything' : 'Purge Selected URLs'

  if (res.ok && data.success) {
    successEl.textContent = type === 'everything'
      ? 'Cache purged successfully! All pages will be refreshed from origin.'
      : `${body.urls?.length ?? 0} URL(s) purged successfully.`
    successEl.hidden = false
    await loadStats(selectedDomainId)
  } else {
    const msg = data.cf_response?.errors?.[0]?.message ?? data.error ?? 'Purge failed'
    errorEl.textContent = `Error: ${msg}`
    errorEl.hidden = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function openDeleteModal(domainId, domainName) {
  domainToDelete = domainId
  document.getElementById('deleteModalDesc').textContent =
    `Remove "${domainName}" from your account? This will also delete all purge history. This cannot be undone.`
  document.getElementById('deleteModal').hidden = false
}

function closeDeleteModal() {
  document.getElementById('deleteModal').hidden = true
  domainToDelete = null
}

async function confirmDelete() {
  if (!domainToDelete) return

  const btn = document.getElementById('deleteConfirmBtn')
  btn.disabled = true
  btn.textContent = 'Removing…'

  const { error } = await _supabase
    .from('user_domains')
    .delete()
    .eq('id', domainToDelete)

  btn.disabled = false
  btn.textContent = 'Remove'
  closeDeleteModal()

  if (!error) {
    if (selectedDomainId === domainToDelete) closeDetail()
    await loadDomains()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtNum(n) {
  if (n == null) return '—'
  return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n/1_000).toFixed(1)}K`
    : String(n)
}
