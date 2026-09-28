'use client';

import Link from 'next/link';
import {
  FileText,
  Package,
  BarChart2,
  Download,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Zap,
  TrendingUp,
  Lock,
} from 'lucide-react';

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#fff',
            textDecoration: 'none',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          <FileText size={20} strokeWidth={1.5} />
          Invoice Manager
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'How it works', 'Pricing'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                color: 'rgba(255,255,255,0.72)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.72)')}
            >
              {item}
            </a>
          ))}
          <Link
            href="/login"
            style={{
              backgroundColor: '#0071e3',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              padding: '7px 18px',
              borderRadius: 980,
              letterSpacing: '-0.01em',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = '#0077ED')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = '#0071e3')}
          >
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  {
    icon: FileText,
    title: 'Smart Invoicing',
    desc: 'Generate GST-compliant invoices in seconds with auto-calculated totals and tax breakdowns.',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    desc: 'Track stock levels in real-time with intelligent low-stock alerts before you run out.',
  },
  {
    icon: BarChart2,
    title: 'Analytics & Reports',
    desc: 'Daily, monthly and yearly sales reports with beautiful interactive visual charts.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    desc: 'Download professional, branded PDF invoices with a single click. Share instantly.',
  },
  {
    icon: Users,
    title: 'Multi-user Access',
    desc: 'Role-based access control for admins and shop staff with granular permissions.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    desc: 'JWT-powered authentication with automatic token refresh and session management.',
  },
];

// ─── Steps ────────────────────────────────────────────────────────────────────
const steps = [
  {
    n: '01',
    title: 'Add Your Products',
    desc: 'Set prices, GST rates, and stock thresholds once. Invoice Manager remembers everything.',
  },
  {
    n: '02',
    title: 'Create Invoices',
    desc: 'Select a customer, choose products, and your invoice is generated with taxes instantly.',
  },
  {
    n: '03',
    title: 'Download & Share',
    desc: 'Export professional PDF invoices and track all activity via the reports dashboard.',
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { value: '50K+', label: 'Invoices Generated' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2s', label: 'PDF Generation' },
  { value: '100%', label: 'GST Compliant' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        color: '#1d1d1f',
        overflowX: 'hidden',
      }}
    >
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#000',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '160px 32px 120px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 800,
            height: 600,
            background: 'radial-gradient(ellipse at center, rgba(0,113,227,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(0,113,227,0.15)',
            border: '1px solid rgba(0,113,227,0.3)',
            borderRadius: 980,
            padding: '5px 14px',
            marginBottom: 32,
            color: '#abc7ff',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          <Zap size={12} strokeWidth={2} />
          Built for Modern Businesses
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(48px, 8vw, 88px)',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            margin: '0 auto 24px',
            maxWidth: 900,
          }}
        >
          The future of
          <br />
          <span style={{ color: '#0071e3' }}>billing.</span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: 'clamp(17px, 2vw, 21px)',
            color: '#6e6e73',
            letterSpacing: '-0.01em',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto 48px',
          }}
        >
          Professional invoicing, inventory control, and GST reporting —{' '}
          designed for the modern business.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/register"
            style={{
              backgroundColor: '#0071e3',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 17,
              fontWeight: 500,
              padding: '14px 28px',
              borderRadius: 980,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: '-0.01em',
              transition: 'background 0.2s, transform 0.1s',
            }}
          >
            Get started for free
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <Link
            href="/login"
            style={{
              color: '#0071e3',
              textDecoration: 'none',
              fontSize: 17,
              fontWeight: 400,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              letterSpacing: '-0.01em',
            }}
          >
            Sign in
            <ChevronRight size={18} strokeWidth={1.5} />
          </Link>
        </div>

        {/* Floating UI Preview */}
        <div
          style={{
            marginTop: 80,
            width: '100%',
            maxWidth: 900,
            background: 'linear-gradient(145deg, #1d1d1f 0%, #111 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {/* Mock Invoice Card */}
          {[
            { label: 'Total Invoices', value: '1,284', change: '+12% this month', color: '#0071e3' },
            { label: 'Revenue Today', value: '₹42,800', change: '+8.3% vs yesterday', color: '#34c759' },
            { label: 'GST Collected', value: '₹7,704', change: 'Compliant & tracked', color: '#ff9f0a' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <p style={{ color: '#6e6e73', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase', margin: '0 0 12px' }}>{card.label}</p>
              <p style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{card.value}</p>
              <p style={{ color: card.color, fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={12} />
                {card.change}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          backgroundColor: '#f5f5f7',
          padding: '80px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 48,
            textAlign: 'center',
          }}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <p
                style={{
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  fontWeight: 700,
                  color: '#1d1d1f',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  margin: '0 0 8px',
                }}
              >
                {s.value}
              </p>
              <p style={{ color: '#6e6e73', fontSize: 16, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#fff',
          padding: '120px 32px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p
              style={{
                color: '#0071e3',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                margin: '0 0 16px',
              }}
            >
              Powerful Features
            </p>
            <h2
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 700,
                color: '#1d1d1f',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                margin: 0,
                maxWidth: 700,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Everything you need.
              <br />
              Nothing you don't.
            </h2>
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 2,
              border: '1px solid #e5e5e7',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  style={{
                    padding: '48px 40px',
                    backgroundColor: '#fff',
                    borderBottom: i < 3 ? '1px solid #e5e5e7' : 'none',
                    borderRight: i % 3 !== 2 ? '1px solid #e5e5e7' : 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f7')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#fff')}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      backgroundColor: 'rgba(0,113,227,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 24,
                    }}
                  >
                    <Icon size={24} strokeWidth={1.5} color="#0071e3" />
                  </div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: '#1d1d1f',
                      letterSpacing: '-0.02em',
                      margin: '0 0 12px',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          backgroundColor: '#000',
          padding: '120px 32px',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <p style={{ color: '#0071e3', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>
              How It Works
            </p>
            <h2
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Simple. Fast. Powerful.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {steps.map((s, i) => (
              <div
                key={s.n}
                style={{
                  backgroundColor: '#1d1d1f',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '48px 40px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Step number watermark */}
                <p
                  style={{
                    position: 'absolute',
                    top: 24,
                    right: 32,
                    fontSize: 80,
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.04)',
                    margin: 0,
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                    userSelect: 'none',
                  }}
                >
                  {s.n}
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 980,
                    backgroundColor: '#0071e3',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 24,
                  }}
                >
                  {i + 1}
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
                  {s.title}
                </h3>
                <p style={{ color: '#6e6e73', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ───────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#f5f5f7', padding: '80px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em', margin: '0 0 48px' }}>
            Built on a solid foundation.
          </h2>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: Shield, text: 'JWT Authentication & auto-refresh' },
              { icon: Lock, text: 'Role-based access control' },
              { icon: CheckCircle, text: 'Atomic database transactions' },
              { icon: TrendingUp, text: 'Real-time stock deduction' },
              { icon: FileText, text: 'GST-compliant PDF invoices' },
              { icon: BarChart2, text: 'Multi-period analytics' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#1d1d1f',
                    fontSize: 15,
                    fontWeight: 400,
                  }}
                >
                  <Icon size={16} color="#0071e3" strokeWidth={2} />
                  {item.text}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#fff', padding: '80px 32px', borderTop: '1px solid #e5e5e7' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#6e6e73', fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, margin: '0 0 40px' }}>
            Built with industry-leading technology
          </p>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            {['Next.js 15', 'React 19', 'TypeScript', 'Django 5', 'JWT Auth', 'Tailwind CSS 4', 'ReportLab PDF', 'SQLite'].map((tech) => (
              <span
                key={tech}
                style={{
                  color: '#1d1d1f',
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  opacity: 0.6,
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#000',
          padding: '120px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse at center, rgba(0,113,227,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <h2
            style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              margin: '0 0 24px',
            }}
          >
            Ready to simplify
            <br />
            your business?
          </h2>
          <p style={{ color: '#6e6e73', fontSize: 19, lineHeight: 1.6, margin: '0 0 48px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            Join thousands of businesses who manage invoices, inventory, and reports — all in one place.
          </p>
          <Link
            href="/register"
            style={{
              backgroundColor: '#0071e3',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 19,
              fontWeight: 500,
              padding: '16px 36px',
              borderRadius: 980,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '-0.01em',
            }}
          >
            Start for free today
            <ArrowRight size={18} strokeWidth={2} />
          </Link>
          <p style={{ color: '#3a3a3c', fontSize: 14, marginTop: 24 }}>
            No credit card required · Setup in minutes
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          backgroundColor: '#000',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '40px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            <FileText size={18} strokeWidth={1.5} />
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Invoice Manager</span>
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Login', href: '/login' },
              { label: 'Register', href: '/register' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                style={{ color: '#6e6e73', textDecoration: 'none', fontSize: 14 }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <p style={{ color: '#3a3a3c', fontSize: 13, margin: 0 }}>
            © {new Date().getFullYear()} Invoice Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
