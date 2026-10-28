# Edit spec: file -> list of (selector, {prop: value}, media, remove)
HERO_PAD = 'var(--hero-top) var(--gutter) var(--hero-bottom)'
HERO_PAD_COMPACT = 'calc(var(--hero-top) * 0.55) var(--gutter) var(--hero-bottom)'
BODY_PAD = 'var(--block-gap) var(--gutter) var(--section-y)'
SEC_PAD = 'var(--section-y) var(--gutter)'
H1 = {'font-size': 'var(--h1)', 'font-weight': '600', 'line-height': '1.04', 'letter-spacing': '-0.025em'}
H1C = {'font-size': 'var(--h1-compact)', 'font-weight': '600', 'line-height': '1.08', 'letter-spacing': '-0.02em'}
LEAD = {'font-size': 'var(--lead)', 'line-height': '1.65'}
H2 = {'font-size': 'var(--h2)', 'font-weight': '600', 'line-height': '1.1'}
H3 = {'font-size': 'var(--h3)', 'font-weight': '600'}
GRID = 'var(--grid-gap)'
WIDE = 'clamp(48px, 6vw, 96px)'
SUB_TOP = 'calc(var(--row-y) + 24px)'
M = '(max-width: 650px)'
M560 = '(max-width: 560px)'

E = {}

E['about-us.css'] = [
    ('.au-hero-inner', {'padding': HERO_PAD}),
    ('.au-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.au-lead', LEAD),
    ('.au-section', {'padding': SEC_PAD}),
    ('.au-h2', H2),
    ('.au-value', {'padding': '40px 0', 'gap': '32px'}),
    ('.au-cta', {'padding': SEC_PAD}),
    ('.au-cta h2', H2),
]
E['alummi.css'] = [
    ('.al-hero-inner', {'padding': HERO_PAD}),
    ('.al-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.al-lead', {**LEAD, 'margin': '0 0 40px'}),
    ('.al-section', {'padding': SEC_PAD}),
    ('.al-h2', H2),
    ('.al-cta', {'padding': SEC_PAD}),
    ('.al-cta h2', H2),
]
E['coffee-chats.css'] = [
    ('.cc-hero-inner', {'padding': HERO_PAD}),
    ('.cc-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.cc-lead', LEAD),
    ('.cc-intro', {'margin': '0 0 48px', 'font-size': 'var(--lead)'}),
    ('.cc-section', {'padding': SEC_PAD}),
    ('.cc-h2', H2),
    ('.cc-person', {'padding': '32px 0', 'gap': '24px'}),
]
E['information.css'] = [
    ('.info2-hero-inner', {'padding': HERO_PAD}),
    ('.info2-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.info2-lead', LEAD),
    ('.info2-body', {'padding': BODY_PAD, 'gap': WIDE}),
    ('.pw-row', {'padding': 'var(--row-y) 0', 'gap': '32px'}),
    ('.pw-head h2', H2),
    ('.pw-cols', {'gap': GRID}),
    ('.info2-cta', {'padding': SEC_PAD}),
    ('.info2-cta h2', H2),
]
E['opportunities.css'] = [
    ('.opps-hero-inner', {'padding': HERO_PAD, 'max-width': 'var(--content-max)'}),
    ('.opps-hero-inner', {}, M560, ('padding',)),
    ('.opps-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.opps-lead', LEAD),
    ('.opps-body', {'padding': BODY_PAD, 'gap': 'var(--block-gap)', 'max-width': 'var(--content-max)'}),
    ('.opps-sidebar-inner', {'gap': '32px'}),
    ('.opps-grid', {'gap': 'clamp(20px, 2.4vw, 28px)'}),
]
E['opportunity-detail.css'] = [
    ('.od-hero-inner', {'padding': HERO_PAD_COMPACT}),
    ('.od-hero h1', {**H1C, 'margin': '0 0 16px'}),
    ('.od-body', {'padding': BODY_PAD}),
    ('.od-grid', {'gap': WIDE}),
    ('.od-section', {'padding-top': '28px', 'margin-bottom': 'var(--block-gap)'}),
    ('.od-section h2', {**H3, 'margin': '0 0 20px'}),
]
E['profile.css'] = [
    ('.pf-hero-inner', {'padding': HERO_PAD_COMPACT, 'gap': '32px'}),
    ('.pf-hero-inner', {}, M560, ('padding',)),
    ('.pf-hero h1', {**H1C, 'margin': '0 0 8px'}),
    ('.pf-body', {'padding': BODY_PAD}),
    ('.pf-grid', {'gap': WIDE}),
    ('.pf-section', {'padding-top': '28px'}),
    ('.pf-section h2', {**H3, 'margin': '0 0 20px'}),
    ('.pf-saved li', {'gap': '24px'}),
]
E['settings.css'] = [
    ('.st-hero-inner', {'padding': HERO_PAD}),
    ('.st-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.st-lead', LEAD),
    ('.st-body', {'padding': BODY_PAD, 'gap': WIDE}),
    ('.st-row', {'padding': 'var(--row-y) 0'}),
    ('.st-intro', {'margin': '0 0 36px'}),
    ('.st-grid', {'gap': '24px 32px'}),
]
E['quiz.css'] = [
    ('.qz-hero-inner', {'padding': HERO_PAD}),
    ('.qz-hero-inner', {}, M560, ('padding',)),
    ('.qz-hero h1', {**H1, 'margin': '0 0 24px'}),
    ('.qz-lead', LEAD),
    ('.qz-body', {'padding': BODY_PAD}),
]
E['guide.css'] = [
    ('.guide-page', {'padding': '0 0 var(--section-y)'}),
    ('.guide-hero-inner', {'padding': HERO_PAD_COMPACT}),
    ('.guide-hero-inner', {}, M, ('padding',)),
    ('.guide-hero h1', {**H1C, 'margin': '0 0 20px'}),
    ('.guide-intro', LEAD),
    ('.guide-section', {'margin-top': 'var(--block-gap)', 'padding-top': '36px'}),
    ('.guide-section h2', {'font-size': 'var(--h3)'}),
    ('.guide-section li', {'margin-bottom': '14px'}),
]
E['t-level.css'] = [
    ('.tl-header-content', {'padding': HERO_PAD}),
    ('.tl-header-content', {}, M, ('padding',)),
    ('.tl-header h1', {**H1, 'margin-bottom': '24px'}),
    ('.tl-tagline', {**LEAD, 'max-width': '640px', 'margin-bottom': '40px'}),
    ('.tl-steps-inner', {'padding': SEC_PAD}),
    ('.fact-grid', {'gap': GRID}),
    ('.step-grid', {'gap': GRID, 'margin-top': '40px'}),
    ('.tl-split', {'gap': WIDE}),
    ('.tl-split', {'gap': '40px'}, M),
    ('.phase-list', {'gap': GRID}),
    ('.skill-grid', {'gap': GRID}),
    ('.reason-list', {'gap': '40px'}),
    ('.role-grid', {'gap': GRID}),
    ('.principle-grid', {'gap': GRID}),
    ('.timeline', {'gap': GRID}),
    ('.timeline-step::before', {'right': 'calc(-1 * var(--grid-gap))'}),
    ('.earn-callout', {'gap': WIDE, 'margin-top': SUB_TOP, 'padding': 'clamp(28px, 4vw, 48px)', 'border-radius': 'var(--radius)'}),
    ('.tl-subheading', {'margin-top': SUB_TOP}),
    ('.tl-subheading', {}, M, ('margin-top',)),
    ('.tl-heading-row', {'margin-top': SUB_TOP, 'margin-bottom': '28px'}),
    ('.tl-section-actions', {'margin-top': 'var(--block-gap)'}),
    ('.framework-box', {'margin-top': SUB_TOP, 'padding': 'clamp(28px, 4vw, 48px)', 'border-radius': 'var(--radius)'}),
    ('.tl-faq', {'gap': '16px'}),
    ('.tl-faq-item', {'padding': '22px 26px', 'border-radius': 'var(--radius)',
                      'transition': 'border-color var(--dur-fast) ease, box-shadow var(--dur) ease'}),
    ('.map-list', {'gap': '16px'}),
    ('.map-item', {'padding': '28px 32px', 'border-radius': 'var(--radius)'}),
    ('.tl-media', {'border-radius': 'var(--radius)'}),
    ('.phase-media', {'border-radius': 'var(--radius)'}),
    ('.tl-table-wrap', {'border-radius': 'var(--radius)'}),
    ('.tl-table th, .tl-table td', {'padding': '18px 22px'}),
    ('.download-button', {'padding': '11px 20px', 'border': '1px solid var(--line)', 'border-radius': '12px',
                          'background': 'var(--white)', 'color': 'var(--navy)', 'font-weight': '600',
                          'transition': 'background var(--dur-fast) ease, border-color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out)'}),
    ('.download-button:hover', {'border-color': '#c9d2dd', 'background': 'var(--light)', 'transform': 'translateY(-2px)'}),
    ('.tl-secondary-on-dark', {'border-color': 'var(--line)'}),
    ('.tl-secondary-on-dark:hover', {'background': 'var(--light)', 'color': 'var(--navy)'}),
    ('.tl-subnav a', {'transition': 'border-color var(--dur) var(--ease-out), color var(--dur-fast) ease'}),
    ('.tl-link', {'transition': 'color var(--dur-fast) ease'}),
]
E['t-level-advice.css'] = [
    ('.advice-header-content', {'padding': HERO_PAD}),
    ('.advice-header-content', {}, M, ('padding',)),
    ('.advice-header h1', {**H1, 'margin-bottom': '24px'}),
    ('.advice-tagline', {**LEAD, 'max-width': '640px'}),
    ('.advice-grid', {'gap': GRID}),
    ('.advice-carousel', {'gap': '20px'}),
    ('.advice-carousel-track', {'gap': '24px'}),
    ('.advice-carousel-track .advice-card', {'flex': '0 0 calc((100% - 48px) / 3)'}),
    ('.advice-carousel-button', {'border': '1px solid var(--line)',
                                 'transition': 'background var(--dur-fast) ease, color var(--dur-fast) ease, border-color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out)'}),
    ('.advice-carousel-button:hover:not(:disabled)', {'background': 'var(--light)', 'color': 'var(--orange-solid)',
                                                      'border-color': '#c9d2dd', 'transform': 'scale(1.06)'}),
    ('.advice-details', {'gap': 'var(--row-y)', 'margin-top': SUB_TOP}),
    ('.advice-details', {}, M, ('gap', 'margin-top')),
    ('.advice-detail', {'gap': WIDE}),
    ('.advice-detail-media', {'border-radius': 'var(--radius)'}),
    ('.advice-detail-text h3', {'font-size': 'var(--h3)', 'margin': '0 0 16px'}),
]
E['admin.css'] = [
    ('.admin-header-content', {'padding': HERO_PAD_COMPACT}),
    ('.admin-header-content', {}, M, ('padding',)),
    ('.admin-header h1', {**H1C, 'margin-bottom': '16px'}),
    ('.admin-tagline', {**LEAD, 'max-width': '640px'}),
    ('.admin-section-title', {**H3, 'margin': '0 0 28px'}),
    ('.admin-opp-form', {'padding': 'clamp(24px, 3vw, 36px)', 'border-radius': 'var(--radius)', 'margin-bottom': 'var(--block-gap)'}),
    ('.admin-form-grid', {'gap': '20px', 'margin-bottom': '24px'}),
    ('.admin-table-wrap', {'border-radius': 'var(--radius)'}),
    ('.admin-table th', {'padding': '16px 20px'}),
    ('.admin-table td', {'padding': '18px 20px'}),
    ('.admin-toolbar', {'margin-bottom': '28px'}),
    ('.admin-delete', {'border-radius': '8px', 'transition': 'background var(--dur-fast) ease, color var(--dur-fast) ease, border-color var(--dur-fast) ease'}),
]
E['interest.css'] = [
    ('.interest-header-content', {'padding': HERO_PAD}),
    ('.interest-header-content', {}, M, ('padding',)),
    ('.interest-header h1', {**H1, 'margin-bottom': '24px'}),
    ('.interest-tagline', {**LEAD, 'max-width': '640px'}),
    ('.interest-card', {'padding': 'clamp(28px, 4vw, 48px)', 'border-radius': 'var(--radius-lg)', 'box-shadow': 'var(--shadow-soft)'}),
    ('.interest-card', {}, M, ('padding',)),
    ('.interest-field', {'margin-bottom': '24px'}),
    ('.interest-field label', {'margin-bottom': '8px'}),
    ('.interest-field input, .interest-field select, .interest-field textarea', {'padding': '13px 15px'}),
    ('.interest-privacy', {'margin': '0 0 28px', 'padding': '16px 18px', 'border-radius': 'var(--radius-sm)'}),
    ('.interest-success h2', {**H3, 'margin-bottom': '14px'}),
]
E['auth.css'] = [
    ('.auth-page', {'padding': 'calc(var(--hero-top) * 0.7) var(--gutter) var(--section-y)'}),
    ('.auth-card', {'padding': 'clamp(32px, 4vw, 48px)', 'border-radius': 'var(--radius-lg)', 'box-shadow': 'var(--shadow-lift)'}),
    ('.auth-title', {'font-size': 'clamp(1.75rem, 3vw, 2.25rem)', 'font-weight': '600', 'margin': '0 0 10px'}),
    ('.auth-subtitle', {'margin': '0 0 32px'}),
    ('.auth-field', {'margin-bottom': '22px'}),
    ('.auth-field label', {'margin-bottom': '8px'}),
    ('.auth-field input', {'padding': '13px 15px'}),
    ('.auth-switch', {'margin': '28px 0 0'}),
]
E['home.css'] = [
    ('.h-hero-inner', {'padding': 'var(--hero-top) var(--gutter) calc(var(--hero-bottom) + 44px)'}),
    ('.h-hero-inner', {}, M560, ('padding',)),
    ('.h-hero-sub', {**LEAD, 'margin': '0 auto 44px'}),
    ('.h-btn-ghost', {'border': '1px solid var(--line)'}),
    ('.h-btn-ghost:hover', {'border-color': '#c9d2dd', 'transform': 'translateY(-2px)'}),
    ('.h-stats', {'padding': 'clamp(32px, 4vw, 48px) clamp(24px, 4vw, 48px)', 'gap': '32px'}),
    ('.h-section', {'padding': SEC_PAD}),
    ('.h-section-head', {'margin': '0 auto var(--block-gap)'}),
    ('.h-section-head h2', {'font-size': 'var(--h2)', 'margin': '0 0 18px'}),
    ('.h-lead', {'font-size': 'var(--lead)'}),
    ('.h-path-grid', {'gap': '20px'}),
    ('.h-steps-wrap', {'padding': SEC_PAD}),
    ('.h-steps', {'gap': GRID}),
    ('.h-step', {'padding': 'clamp(28px, 3vw, 40px)'}),
    ('.h-cta-inner', {'padding': SEC_PAD}),
    ('.h-cta-inner h2', {'font-size': 'var(--h2)', 'margin': '0 0 16px'}),
    ('.h-cta-inner p', {'margin': '0 0 36px', 'font-size': 'var(--lead)'}),
]

# Global 500 -> 600 on headings, 2px -> modern radius (older pages only)
OLDER = ['t-level.css', 't-level-advice.css', 'admin.css', 'interest.css', 'auth.css']
