/**
 * Luzerge.com — Frontend JavaScript
 * Handles: contact form, nav mobile menu, analytics, char count
 */

'use strict'

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = '/api'
const SESSION_ID = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)

// ─── Analytics (privacy-first, no cookies) ───────────────────────────────────

function trackEvent(eventType, extra = {}) {
  const payload = {
    event_type: eventType,
    page_path: location.pathname,
    referrer: document.referrer || null,
    utm_source: new URLSearchParams(location.search).get('utm_source'),
    utm_medium: new URLSearchParams(location.search).get('utm_medium'),
    utm_campaign: new URLSearchParams(location.search).get('utm_campaign'),
    session_id: SESSION_ID,
    ...extra,
  }

  // Non-blocking — don't await, don't block UX
  fetch(`${API_BASE}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})  // Silently fail — analytics is non-critical
}

// ─── Contact form ─────────────────────────────────────────────────────────────

function initContactForm() {
  const form = document.getElementById('contactForm')
  if (!form) return

  const submitBtn = document.getElementById('submitBtn')
  const formSuccess = document.getElementById('formSuccess')
  const formError = document.getElementById('formError')
  const charCount = document.getElementById('charCount')
  const messageInput = document.getElementById('message')

  // Character counter
  if (messageInput && charCount) {
    messageInput.addEventListener('input', () => {
      charCount.textContent = `${messageInput.value.length} / 2000`
    })
  }

  // Track form start
  let formStarted = false
  form.addEventListener('focusin', () => {
    if (!formStarted) {
      formStarted = true
      trackEvent('form_start')
    }
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Clear previous errors
    clearErrors()
    formSuccess.hidden = true
    formError.hidden = true

    // Gather and validate
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || undefined,
      service: form.service.value || undefined,
      message: form.message.value.trim(),
    }

    if (!validate(data)) return

    // Submit
    submitBtn.disabled = true
    submitBtn.textContent = 'Sending…'
    trackEvent('form_submit')

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        form.reset()
        if (charCount) charCount.textContent = '0 / 2000'
        formSuccess.hidden = false
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        trackEvent('form_success')
      } else {
        formError.hidden = false
        trackEvent('form_error', { error: json.error })
      }
    } catch {
      formError.hidden = false
      trackEvent('form_error', { error: 'network_error' })
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Send Message →'
    }
  })
}

function validate(data) {
  let valid = true

  if (!data.name || data.name.length < 2) {
    setError('name', 'nameError', 'Please enter your full name (at least 2 characters)')
    valid = false
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    setError('email', 'emailError', 'Please enter a valid email address')
    valid = false
  }

  if (!data.message || data.message.length < 10) {
    setError('message', 'messageError', 'Please tell us a bit more (at least 10 characters)')
    valid = false
  }

  if (data.message && data.message.length > 2000) {
    setError('message', 'messageError', 'Message must be 2000 characters or less')
    valid = false
  }

  return valid
}

function setError(inputId, errorId, message) {
  const input = document.getElementById(inputId)
  const error = document.getElementById(errorId)
  if (input) input.classList.add('is-invalid')
  if (error) error.textContent = message
}

function clearErrors() {
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('is-invalid'))
  document.querySelectorAll('.form-error').forEach(el => { el.textContent = '' })
}

// ─── Mobile navigation ────────────────────────────────────────────────────────

function initMobileNav() {
  const toggle = document.querySelector('.nav__toggle')
  const links = document.querySelector('.nav__links')
  if (!toggle || !links) return

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open')
    toggle.setAttribute('aria-expanded', isOpen.toString())
  })

  // Close on link click
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('is-open')
      toggle.setAttribute('aria-expanded', 'false')
    })
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('is-open')
      toggle.setAttribute('aria-expanded', 'false')
    }
  })
}

// ─── Footer year ─────────────────────────────────────────────────────────────

function setFooterYear() {
  const el = document.getElementById('footerYear')
  if (el) el.textContent = new Date().getFullYear()
}

// ─── Intersection Observer for subtle animations ──────────────────────────────

function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const style = document.createElement('style')
  style.textContent = `
    .animate-in { opacity: 0; transform: translateY(20px); transition: opacity .5s ease, transform .5s ease; }
    .animate-in.visible { opacity: 1; transform: none; }
  `
  document.head.appendChild(style)

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )

  document.querySelectorAll('.service-card, .step, .pricing-card').forEach(el => {
    el.classList.add('animate-in')
    observer.observe(el)
  })
}

// ─── Page view tracking ───────────────────────────────────────────────────────

function initPageTracking() {
  // Track initial page view after a short delay (not blocking)
  setTimeout(() => trackEvent('page_view'), 500)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav()
  initContactForm()
  initScrollAnimations()
  setFooterYear()
  initPageTracking()
})
