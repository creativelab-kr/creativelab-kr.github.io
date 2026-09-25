/**
 * CreativeLab Portfolio - main.js
 *
 * Three views, two levels deep at most:
 *   #home / #products / #lineup / #areas -> home (hero, two big tiles, carousel, areas)
 *   #/c/<categoryId>                     -> a business area (vision + 3D image + past work) or an app group
 *   #/p/<projectId>                      -> one product (App Store releases only)
 *
 * All screen content comes from data/*.json. Past work shown under each business
 * area lives in data/works.json (area id -> list), kept apart from projects.json. The getDefault* fallbacks below
 * are used only when those files cannot be read, and they must stay REAL -
 * never placeholder or invented data.
 */

// =============================================
// STATE
// =============================================

const state = {
    projects: [],
    categories: [],
    works: {},
};

/**
 * The contact address is kept in pieces so that no file on this site - HTML or
 * JS - contains the whole string for an address harvester to lift. It is joined
 * only at runtime, and the page also shows it (split, with hidden decoy text)
 * so a visitor with JavaScript switched off can still read it.
 */
const EMAIL_PARTS = ['creativelab', '.choi', 'gmail', '.com'];
function contactEmail() {
    return EMAIL_PARTS[0] + EMAIL_PARTS[1] + String.fromCharCode(64) + EMAIL_PARTS[2] + EMAIL_PARTS[3];
}
const DEVELOPER_PAGE = 'https://apps.apple.com/kr/developer/inphil-choi/id6785766361';

const LINK_LABELS = {
    appstore: 'App Store에서 받기',
    googleplay: 'Google Play에서 받기',
    web: '웹에서 보기'
};

// =============================================
// INLINE SVG ICONS (no emoji, no icon font)
// =============================================

function svg(paths, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" fill="none"
        stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" focusable="false">${paths}</svg>`;
}

const ICONS = {
    arrowRight: svg('<path d="M5 12h13"/><path d="m12 5 7 7-7 7"/>', 14),
    arrowLeft: svg('<path d="M19 12H6"/><path d="m12 5-7 7 7 7"/>', 15),
    chevron: svg('<path d="m9 5 7 7-7 7"/>', 18),
    chevronSmall: svg('<path d="m9 6 6 6-6 6"/>', 12),
    // one glyph per category, drawn rather than picked from a font
    ai: svg('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>'),
    platform: svg('<circle cx="12" cy="6" r="2.6"/><circle cx="5.5" cy="17" r="2.6"/><circle cx="18.5" cy="17" r="2.6"/><path d="M10.2 8.1 7.3 14.9M13.8 8.1l2.9 6.8M8.1 17h7.8"/>'),
    fintech: svg('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
    security: svg('<path d="M12 3 4.5 6v6.2c0 4.1 3 7.4 7.5 8.8 4.5-1.4 7.5-4.7 7.5-8.8V6z"/><path d="m9 12.2 2.1 2.1L15 10.5"/>'),
    quantum: svg('<ellipse cx="12" cy="12" rx="9.4" ry="3.9" transform="rotate(42 12 12)"/><ellipse cx="12" cy="12" rx="9.4" ry="3.9" transform="rotate(-42 12 12)"/><circle cx="12" cy="12" r="1.7"/>'),
    chain: svg('<path d="M9.5 14.5 14.5 9.5"/><path d="M13 6.5 14.6 5a4 4 0 0 1 5.7 5.7l-1.6 1.5"/><path d="M11 17.5 9.4 19a4 4 0 0 1-5.7-5.7l1.6-1.5"/>'),
    shop: svg('<path d="M4 7h16l-1.3 12.1a2 2 0 0 1-2 1.9H7.3a2 2 0 0 1-2-1.9z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>'),
    life: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
    work: svg('<path d="M4 7h16v13H4z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M4 12h16"/>'),
    game: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>'),
    learn: svg('<path d="M3 6.5 12 3l9 3.5-9 3.5z"/><path d="M6 9.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3V9.5"/>'),
    health: svg('<path d="M3 12h4l2-5 3 10 2.5-6 1.5 3h5"/>'),
    money: svg('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
    infra: svg('<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.8 2.6 15.2 0 18"/><path d="M12 3c-2.6 2.8-2.6 15.2 0 18"/>')
};

// =============================================
// BOOT
// =============================================

async function initializeApp() {
    await Promise.all([loadProjects(), loadCategories(), loadWorks()]);

    renderRing();
    renderProducts();
    renderLineup();
    renderAreas();
    setupContact();

    window.addEventListener('hashchange', route);
    route();
    setupReveal();
    setupRing();
    setupAreaParallax();
}

/**
 * 스크롤에 맞춰 구획이 떠오르게 한다. 애플 사이트의 리듬을 참조한 부분이다.
 *
 * 규칙이 두 가지 있다.
 *  1. 처음부터 화면에 들어와 있는 것은 **숨기지 않는다.** 첫 화면이 한 번 깜빡였다가
 *     나타나면 느려 보이고, 관찰자가 늦게 돌면 빈 화면을 보게 된다.
 *  2. 그래도 관찰자가 아예 안 돌 수 있으니 2초 뒤에는 무조건 다 보여 준다.
 *     움직임은 덤이고 글이 보이는 것이 먼저다.
 * 움직임을 줄이도록 설정한 사람에게는 아무것도 하지 않는다.
 */
function setupReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const hidden = [];
    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        // 이미 보이는 자리에 있으면 그대로 둔다.
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
        el.classList.add('reveal');
        hidden.push(el);
    });
    if (!hidden.length) return;

    const show = (el) => { el.classList.add('reveal-in'); };
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            show(entry.target);
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    hidden.forEach((el) => io.observe(el));

    // 관찰자가 돌지 않는 환경을 대비한 안전장치.
    setTimeout(() => hidden.forEach(show), 2000);
}

const REVEAL_SELECTOR = '.ftile-copy, .ftile-media, .lineup-head, .section-head, #areaGrid';

// =============================================
// DATA
// =============================================

async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + path);
    return response.json();
}

async function loadProjects() {
    try {
        state.projects = await loadJson('data/projects.json');
    } catch (error) {
        console.error('projects.json 을 읽지 못했습니다:', error);
        state.projects = getDefaultProjects();
    }
}

/**
 * 사업 영역마다 그동안 만든 것. 없으면 조용히 빈 채로 둔다 — 영역 화면은 비전만으로도 선다.
 */
async function loadWorks() {
    try {
        const works = await loadJson('data/works.json');
        state.works = works && typeof works === 'object' && !Array.isArray(works) ? works : {};
    } catch (error) {
        console.error('works.json 을 읽지 못했습니다:', error);
        state.works = {};
    }
}

function worksOf(categoryId) {
    const list = state.works[categoryId];
    return Array.isArray(list) ? list.filter(w => w && w.name && w.title) : [];
}

async function loadCategories() {
    try {
        state.categories = await loadJson('data/categories.json');
    } catch (error) {
        console.error('categories.json 을 읽지 못했습니다:', error);
        state.categories = getDefaultCategories();
    }
}


// =============================================
// ROUTER  (max two levels: category -> project)
// =============================================

function route() {
    const hash = location.hash;
    const category = hash.match(/^#\/c\/([A-Za-z0-9_-]+)$/);
    const project = hash.match(/^#\/p\/(\d+)$/);

    if (category && renderCategoryView(category[1])) return showView('viewCategory');
    if (project && renderProjectView(Number(project[1]))) return showView('viewProject');

    showView('viewHome');
    // Anchor links on the home page (#products, #lineup, #areas) still scroll.
    const anchor = hash && !hash.startsWith('#/') ? document.querySelector(hash) : null;
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showView(id) {
    ['viewHome', 'viewCategory', 'viewProject'].forEach(viewId => {
        const el = document.getElementById(viewId);
        if (el) el.hidden = viewId !== id;
    });
    if (id !== 'viewHome') window.scrollTo(0, 0);
}

// =============================================
// HOME
// =============================================

/**
 * 애플이 파는 제품만 보여 주듯, 화면에는 App Store 에 나와 있는 앱만 올린다.
 * 나머지 항목은 data/projects.json 에 그대로 두되 어디에도 그리지 않는다.
 * 상태 이름(출시·준비 중 따위)도 화면 글자로는 쓰지 않는다.
 */
function isShipped(project) {
    return Boolean(project && project.status === '출시' && project.links && project.links.appstore);
}

function shippedOf(categoryId) {
    return state.projects
        .filter(p => p.category === categoryId && isShipped(p))
        .slice()
        .sort((a, b) => a.id - b.id);
}

/**
 * 홈은 짧게. 몇 개를 만들었는지는 어디에도 쓰지 않는다.
 *  1. 첫 화면 — 한 문장, 실제 앱 화면 세 장(살짝 기울인 CSS 3D)
 *  2. 큰 타일 두 개 — 대표 제품
 *  3. 캐러셀 — 나머지 제품 전부를 좌우로(애플 "알아보기" 줄처럼)
 *  4. 사업 영역 — 3D 렌더 이미지 타일 여섯
 * 앱 사진은 전부 실제 스토어 스크린샷을 줄인 것(assets/shots),
 * 영역 이미지는 tools/render-areas 로 렌더링한 것(assets/areas)이다.
 */
const FEATURED_IDS = [1, 16];
/** 캐러셀 앞쪽 순서. 화면 사진이 있는 것을 먼저, 나머지는 아이콘 카드로 뒤에 붙는다. */
const LINEUP_LEAD = [15, 72, 17, 34, 20, 18, 9, 2, 8, 4, 31, 14];

function byId(id) {
    return state.projects.find(p => p.id === id);
}

function withShot(ids) {
    return ids.map(byId).filter(p => p && p.shot && isShipped(p));
}

function categoryOf(project) {
    return state.categories.find(c => c.id === project.category);
}

/** 아이폰 모양 틀 안에 실제 화면 한 장. eager 는 첫 화면에 보이는 것만. */
function phone(project, { eager = false, extra = '' } = {}) {
    return `<figure class="phone ${extra}">
        <span class="phone-screen"><img src="${encodeURI(project.shot)}"
            alt="${escapeHtml(project.title)} 앱 화면" width="600" height="1304"
            ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></span>
    </figure>`;
}

function appStoreLink(project, label = 'App Store') {
    const href = project.links && project.links.appstore;
    return href
        ? `<a class="tile-link" href="${encodeURI(href)}" target="_blank" rel="noopener noreferrer"
              aria-label="${escapeHtml(project.title)} App Store에서 보기">${label} ${ICONS.chevronSmall}</a>`
        : '';
}

function tileLinks(project) {
    return `<p class="tile-links">
        <a class="tile-link" href="#/p/${project.id}">더 알아보기 ${ICONS.chevronSmall}</a>
        ${appStoreLink(project)}
    </p>`;
}

/**
 * 첫 화면의 회전 링에 올릴 앱 — 출시한 앱 전부.
 * 맨 앞은 캐러셀 앞줄(LINEUP_LEAD) 첫 앱이고, 바로 아래 큰 타일(달력·수담)은 링의 뒤쪽 끝에 둔다
 * — 첫 화면과 그 아래 타일에 같은 화면이 연달아 보이지 않게.
 */
function ringProjects() {
    const featured = FEATURED_IDS.map(byId).filter(p => p && isShipped(p));
    return lineupProjects().concat(featured);
}

/** 폰 틀 한 장. 화면 사진이 없는 앱은 같은 틀 안에 앱 아이콘을 크게 세운다. */
function ringPhone(project, eager) {
    if (project.shot) return phone(project, { eager });
    return `<figure class="phone">
        <span class="phone-screen phone-iconic"><img src="${encodeURI(project.icon)}"
            alt="${escapeHtml(project.title)} 앱 아이콘" width="192" height="192"
            ${eager ? '' : 'loading="lazy"'} decoding="async"></span>
    </figure>`;
}

function renderRing() {
    const track = document.getElementById('ringTrack');
    if (!track) return;
    const items = ringProjects();
    const n = items.length;
    // 앞쪽(0번)과 양옆 두 장씩만 바로 불러오고 나머지는 늦게.
    const eager = new Set([0, 1, 2, n - 1, n - 2]);
    track.innerHTML = items.map((p, i) => `
        <a class="ring-item" href="#/p/${p.id}" data-i="${i}" tabindex="-1" draggable="false"
           aria-label="${escapeHtml(p.title)}">${ringPhone(p, eager.has(i))}</a>`).join('');
    track.dataset.count = String(n);
    state.ring = items;
}

function renderProducts() {
    const feature = document.getElementById('featureTiles');
    if (!feature) return;
    feature.innerHTML = withShot(FEATURED_IDS).map((p, i) => {
        const category = categoryOf(p);
        return `<article class="ftile ${i % 2 ? '' : 'ftile-soft'}">
            <div class="ftile-copy">
                <p class="ftile-eyebrow">${escapeHtml(category ? category.name : '')}</p>
                <h2 class="ftile-name">${escapeHtml(p.title)}</h2>
                <p class="ftile-headline">${escapeHtml(p.headline || '')}</p>
                <p class="ftile-pitch">${escapeHtml(p.pitch || '')}</p>
                ${tileLinks(p)}
            </div>
            <div class="ftile-media">${phone(p)}</div>
        </article>`;
    }).join('');
}

/** 캐러셀 카드 하나. 화면 사진이 있으면 폰 틀, 없으면 앱 아이콘을 크게. */
function productCard(project) {
    const category = categoryOf(project);
    const media = project.shot
        ? phone(project, { extra: 'phone-card' })
        : `<span class="ccard-icon"><img src="${encodeURI(project.icon)}" alt="${escapeHtml(project.title)} 앱 아이콘"
               width="132" height="132" loading="lazy" decoding="async"></span>`;
    return `<article class="ccard ${project.shot ? '' : 'ccard-iconic'}">
        <a class="ccard-hit" href="#/p/${project.id}">
            <span class="ccard-media">${media}</span>
            <span class="ccard-copy">
                <span class="ccard-cat">${escapeHtml(category ? category.name : '')}</span>
                <span class="ccard-name">${escapeHtml(project.title)}</span>
                <span class="ccard-line">${escapeHtml(project.headline || '')}</span>
            </span>
        </a>
        <p class="ccard-links">${appStoreLink(project)}</p>
    </article>`;
}

function lineupProjects() {
    const featured = new Set(FEATURED_IDS);
    const lead = LINEUP_LEAD.map(byId).filter(p => isShipped(p) && !featured.has(p.id));
    const seen = new Set([...featured, ...lead.map(p => p.id)]);
    const rest = state.projects
        .filter(p => isShipped(p) && !seen.has(p.id))
        .sort((a, b) => (b.shot ? 1 : 0) - (a.shot ? 1 : 0) || a.id - b.id);
    return lead.concat(rest);
}

/**
 * 좌우로 넘기는 줄. 스크롤은 브라우저 것 그대로 쓴다(터치 스와이프·트랙패드 가로 스크롤·
 * 스크롤 스냅이 공짜로 따라온다). 화살표 버튼은 한 화면씩 넘기고, 끝에 닿으면 꺼진다.
 * 카드 안의 링크로 Tab 을 옮기면 브라우저가 그 카드를 보이는 자리로 끌어온다.
 */
function carousel(host, cardsHtml, label) {
    host.innerHTML = `
        <div class="carousel-track" tabindex="0" role="group" aria-label="${escapeHtml(label)}">${cardsHtml}</div>
        <div class="carousel-nav container">
            <button class="carousel-btn" type="button" data-dir="-1" aria-label="이전">${ICONS.chevron}</button>
            <button class="carousel-btn" type="button" data-dir="1" aria-label="다음">${ICONS.chevron}</button>
        </div>`;
    const track = host.querySelector('.carousel-track');
    const [prev, next] = host.querySelectorAll('.carousel-btn');
    const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
    };
    const page = (dir) => {
        const card = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const step = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
        const n = Math.max(1, Math.floor((track.clientWidth - 40) / step));
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        track.scrollBy({ left: dir * n * step, behavior: smooth ? 'smooth' : 'auto' });
    };
    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', (e) => {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
    });
    window.addEventListener('resize', update);
    enableDragScroll(track, page);
    update();
    // 이미지가 늦게 들어와 폭이 바뀌어도 버튼 상태가 맞도록 한 번 더.
    setTimeout(update, 600);
}

/**
 * 마우스로 잡아 끌어서 넘기기. 터치·트랙패드는 브라우저가 이미 해 주므로 마우스일 때만 붙는다.
 * 끄는 동안은 스크롤 스냅을 잠시 끄고, 놓으면 가장 가까운 카드에 맞춰 멈춘다(빠르게 튕기면 한 칸 더).
 * 끌고 난 직후의 클릭은 막아서, 끌다 놓았을 때 카드 링크가 열리지 않게 한다.
 */
function enableDragScroll(track, page) {
    let down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, v = 0;
    track.addEventListener('dragstart', (e) => e.preventDefault());
    track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = false;
        startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = performance.now(); v = 0;
    });
    window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 5) {
            moved = true;
            track.classList.add('is-dragging');
            try { track.setPointerCapture(e.pointerId); } catch (_) { /* 합성 이벤트 등 */ }
        }
        if (!moved) return;
        track.scrollLeft = startLeft - dx;
        const now = performance.now();
        v = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX; lastT = now;
    });
    const end = () => {
        if (!down) return;
        down = false;
        if (!moved) return;
        track.classList.remove('is-dragging');
        // 빠르게 튕겼으면 그 방향으로 한 칸, 아니면 스냅이 가까운 카드에 맞춘다.
        if (Math.abs(v) > 0.6) page(v < 0 ? 1 : -1);
        setTimeout(() => { moved = false; }, 0);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
}

function renderLineup() {
    const host = document.getElementById('lineupCarousel');
    if (!host) return;
    carousel(host, lineupProjects().map(productCard).join(''), '제품 목록');
}

/**
 * 사업 영역 타일 — 렌더링한 3D 이미지, 영역 이름, 한 줄 비전.
 * 비전 아래에 그 영역에서 만든 것의 이름을 두 개까지 작게 적는다(살짝 — 목록이 아니라 단서).
 */
function areaTile(category) {
    const names = worksOf(category.id).slice(0, 2).map(w => escapeHtml(w.name));
    return `<a class="atile" href="#/c/${encodeURIComponent(category.id)}">
        <span class="atile-media"><img src="${encodeURI(category.image)}" alt="" width="1440" height="900"
            loading="lazy" decoding="async"></span>
        <span class="atile-copy">
            <span class="atile-name">${escapeHtml(category.name)}</span>
            <span class="atile-vision">${escapeHtml(category.vision)}</span>
            ${names.length ? `<span class="atile-works">${names.join('<span class="atile-dot" aria-hidden="true"></span>')}</span>` : ''}
            <span class="tile-link">자세히 ${ICONS.chevronSmall}</span>
        </span>
    </a>`;
}

function domains() {
    return state.categories.filter(c => c.group === 'domain' && c.image);
}

/**
 * 영역이 열 개가 되면서 격자로 쌓으면 홈이 다시 길어진다. "모든 제품." 줄과 같은 방식으로
 * 좌우로 넘기는 한 줄에 놓는다.
 */
function renderAreas() {
    const host = document.getElementById('areaGrid');
    if (host) carousel(host, domains().map(areaTile).join(''), '사업 영역');
}

/**
 * 첫 화면의 회전 링.
 *  - 앱마다 원통 둘레의 한 칸(360°/n)에 세우고, 링 전체를 돌려 앞에 올 앱을 고른다.
 *  - 끌기(마우스·터치) · 트랙패드 가로 밀기 · 화살표 버튼 · 좌우 방향키로 돈다. 놓으면 가까운 앱에 멈춘다.
 *  - 가만히 두면 천천히 한 칸씩 돈다. 누가 만지면 잠시 멈춘다.
 *  - 세로 스크롤은 절대 가로채지 않는다(가로 움직임이 더 클 때만 링이 받는다).
 *  - 움직임을 줄이도록 설정했으면 자동 회전 없이, 넘길 때도 애니메이션 없이 바로 바뀐다.
 */
function setupRing() {
    const viewport = document.getElementById('ringViewport');
    const track = document.getElementById('ringTrack');
    const caption = document.getElementById('ringCaption');
    const items = Array.from(document.querySelectorAll('.ring-item'));
    const projects = state.ring || [];
    const n = items.length;
    if (!viewport || !track || !n) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = 360 / n;
    let radius = 0;
    let rot = 0;          // 지금 각도(도)
    let target = 0;       // 멈출 각도
    let front = -1;
    let dragging = false, moved = false, startX = 0, startRot = 0, lastX = 0, lastT = 0, velocity = 0;
    let idleUntil = 0;
    let raf = 0;

    const mod = (a, m) => ((a % m) + m) % m;
    const indexAt = (deg) => mod(Math.round(deg / step), n);

    function layout() {
        const w = items[0].getBoundingClientRect().width || 200;
        // 이웃한 폰끼리 살짝 떨어지도록 둘레를 잡는다.
        radius = Math.round((w / 2 + Math.max(10, w * 0.07)) / Math.tan(Math.PI / n));
        viewport.style.setProperty('--ring-persp', Math.round(radius * 2.1) + 'px');
        items.forEach((el, i) => {
            el.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
        });
        paint();
    }

    function paint() {
        track.style.transform = `translateZ(${-radius}px) rotateY(${-rot}deg)`;
        items.forEach((el, i) => {
            // 앞에서 벗어난 각도 → 투명도. 옆으로 75° 넘어가면 숨긴다(뒤쪽 폰이 비쳐 어지럽지 않게).
            const rel = ((i * step - rot) % 360 + 540) % 360 - 180;
            const c = Math.cos(rel * Math.PI / 180);
            const o = Math.max(0, (c - 0.26) / 0.74);
            el.style.opacity = o.toFixed(3);
            el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
            el.style.pointerEvents = o > 0.2 ? 'auto' : 'none';
        });
        const f = indexAt(rot);
        if (f !== front) setFront(f);
    }

    function setFront(i) {
        front = i;
        items.forEach((el, k) => {
            el.classList.toggle('is-front', k === i);
            el.tabIndex = k === i ? 0 : -1;
        });
        const p = projects[i];
        if (!p || !caption) return;
        const category = categoryOf(p);
        caption.innerHTML = `
            <p class="ring-cat">${escapeHtml(category ? category.name : '')}</p>
            <p class="ring-name">${escapeHtml(p.title)}</p>
            <p class="ring-line">${escapeHtml(p.headline || '')}</p>
            <p class="tile-links ring-links">
                <a class="tile-link" href="#/p/${p.id}">더 알아보기 ${ICONS.chevronSmall}</a>
                ${appStoreLink(p)}
            </p>`;
    }

    function animate() {
        raf = 0;
        if (reduce) { rot = target; paint(); return; }
        const d = target - rot;
        if (Math.abs(d) < 0.05) { rot = target; paint(); return; }
        rot += d * 0.14;
        paint();
        raf = requestAnimationFrame(animate);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(animate); };
    const hold = (ms) => { idleUntil = performance.now() + ms; };

    function go(delta) {
        target = Math.round(target / step + delta) * step;
        hold(9000);
        kick();
    }
    function goTo(i) {
        // 가장 가까운 방향으로 돈다.
        const cur = Math.round(target / step);
        let d = mod(i - cur, n);
        if (d > n / 2) d -= n;
        target = (cur + d) * step;
        hold(9000);
        kick();
    }

    // 끌기
    viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true; moved = false;
        startX = lastX = e.clientX; lastT = performance.now();
        startRot = rot; velocity = 0;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        hold(9000);
    });
    window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 6) { moved = true; viewport.classList.add('dragging'); try { viewport.setPointerCapture(e.pointerId); } catch (_) { /* 합성 이벤트 등 */ } }
        if (!moved) return;
        const w = items[0].getBoundingClientRect().width || 200;
        rot = startRot - dx * (step / (w * 0.9));
        const now = performance.now();
        velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX; lastT = now;
        target = rot;
        paint();
    });
    const end = () => {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('dragging');
        if (!moved) return;
        const w = items[0].getBoundingClientRect().width || 200;
        // 놓는 순간의 속도만큼 조금 더 미끄러진 뒤 가까운 앱에 멈춘다.
        const coast = -velocity * 220 * (step / (w * 0.9));
        target = Math.round((rot + coast) / step) * step;
        hold(9000);
        kick();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    // 끌고 난 뒤의 클릭은 무시하고, 옆 폰을 누르면 그 앱을 앞으로 가져온다.
    items.forEach((el, i) => {
        el.addEventListener('click', (e) => {
            if (moved) { e.preventDefault(); moved = false; return; }
            if (i !== front) { e.preventDefault(); goTo(i); }
        });
    });

    // 트랙패드 가로 밀기(세로 스크롤은 그대로 페이지로 보낸다)
    let wheelAcc = 0, wheelTimer = 0;
    viewport.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        wheelAcc += e.deltaX;
        const w = items[0].getBoundingClientRect().width || 200;
        rot += e.deltaX * (step / (w * 1.4));
        target = rot;
        paint();
        hold(9000);
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { target = Math.round(rot / step) * step; wheelAcc = 0; kick(); }, 140);
    }, { passive: false });

    // 버튼·방향키
    document.getElementById('ringPrev')?.addEventListener('click', () => go(-1));
    document.getElementById('ringNext')?.addEventListener('click', () => go(1));
    viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });
    viewport.addEventListener('focusin', () => hold(12000));
    viewport.addEventListener('pointerenter', () => hold(6000));

    // 저절로 천천히 한 칸씩 — 화면에 보이고, 탭이 보이고, 아무도 안 만질 때만.
    let visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.2 }).observe(viewport);
    }
    if (!reduce) {
        setInterval(() => {
            if (dragging || !visible || document.hidden) return;
            if (performance.now() < idleUntil) return;
            target = Math.round(target / step + 1) * step;
            kick();
        }, 3600);
    }

    window.addEventListener('resize', layout);
    layout();
}

/**
 * 영역 이미지의 은은한 시차. 화면을 지나가는 동안 그림이 틀 안에서 몇 픽셀 떠오른다.
 * 움직임을 줄이도록 설정했으면 정지.
 */
function setupAreaParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let queued = false;
    const apply = () => {
        queued = false;
        const vh = window.innerHeight;
        document.querySelectorAll('.atile-media img, .area-hero img').forEach((img) => {
            const r = img.parentElement.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
            img.style.setProperty('--py', (t * 14).toFixed(1) + 'px');
        });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('hashchange', () => setTimeout(queue, 0));
    apply();
}

// =============================================
// LEVEL 1 : CATEGORY
// =============================================

function renderCategoryView(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    const body = document.getElementById('categoryBody');
    if (!category || !body) return false;

    if (category.group === 'domain') {
        const list = domains();
        const i = list.findIndex(c => c.id === category.id);
        const prev = list[i - 1], next = list[i + 1];
        body.innerHTML = `
            <a class="back-link" href="#areas">${ICONS.arrowLeft} 홈으로</a>
            <header class="detail-head detail-head-center">
                <p class="detail-eyebrow">${escapeHtml(category.name)}</p>
                <h1 class="detail-title">${escapeHtml(category.vision)}</h1>
                <p class="detail-intro">${escapeHtml(category.lede)}</p>
            </header>
            ${category.image ? `<div class="area-hero"><img src="${encodeURI(category.image)}" alt=""
                width="1440" height="900" fetchpriority="high" decoding="async"></div>` : ''}
            ${worksSection(category.id)}
            <nav class="pd-nav">
                ${prev ? `<a href="#/c/${prev.id}"><span class="pd-nav-label">이전</span>${escapeHtml(prev.name)}</a>` : '<span></span>'}
                ${next ? `<a href="#/c/${next.id}" style="text-align:right"><span class="pd-nav-label">다음</span>${escapeHtml(next.name)}</a>` : '<span></span>'}
            </nav>`;
        return true;
    }

    // 앱 갈래: 나와 있는 앱이 하나도 없으면 이 화면은 없다.
    const items = shippedOf(categoryId);
    if (!items.length) return false;
    body.innerHTML = `
        <a class="back-link" href="#lineup">${ICONS.arrowLeft} 홈으로</a>
        <header class="detail-head detail-head-center">
            <p class="detail-eyebrow">${escapeHtml(category.name)}</p>
            <h1 class="detail-title">${escapeHtml(category.vision)}</h1>
            <p class="detail-intro">${escapeHtml(category.lede)}</p>
        </header>
        <div class="card-grid">${items.map(productCard).join('')}</div>
    `;
    return true;
}

/**
 * 영역 화면의 "그동안 만든 것". 실제 화면 사진 한 장, 짧은 제목, 한두 문장.
 * 상태(출시·개발 중 따위)와 숫자 자랑은 싣지 않는다 — 그런 글자는 works.json 에도 두지 않는다.
 * 세 개면 첫 사례를 넓게, 나머지를 두 칸으로 놓는다.
 */
function worksSection(categoryId) {
    const works = worksOf(categoryId).slice(0, 4);
    if (!works.length) return '';
    return `<section class="works" aria-labelledby="worksTitle">
        <h2 class="works-title" id="worksTitle">그동안 만든 것.</h2>
        <div class="works-grid" data-n="${works.length}">
            ${works.map(workCard).join('')}
        </div>
    </section>`;
}

/** phone: true 면 세로 앱 화면 — 회색 판 가운데에서 폰 화면이 위로 솟는다. 아니면 가로 화면 한 장. */
function workCard(work) {
    const [w, h] = work.phone ? [600, 1304] : [1200, 750];
    return `<article class="work">
        ${work.image ? `<div class="work-media${work.phone ? ' is-phone' : ''}"><img src="${encodeURI(work.image)}" alt="${escapeHtml(work.alt || '')}"
            width="${w}" height="${h}" loading="lazy" decoding="async"></div>` : ''}
        <div class="work-copy">
            <p class="work-name">${escapeHtml(work.name)}</p>
            <h3 class="work-head">${escapeHtml(work.title)}</h3>
            ${work.body ? `<p class="work-body">${escapeHtml(work.body)}</p>` : ''}
        </div>
    </article>`;
}

// =============================================
// LEVEL 2 : PROJECT
// =============================================

function renderProjectView(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    const body = document.getElementById('projectBody');
    if (!isShipped(project) || !body) return false;

    const category = categoryOf(project);
    const siblings = shippedOf(project.category);
    const index = siblings.findIndex(p => p.id === project.id);
    const prev = siblings[index - 1];
    const next = siblings[index + 1];
    const story = project.story || {};
    const links = project.links || {};
    const linkKeys = Object.keys(LINK_LABELS).filter(key => links[key]);
    const backLabel = category ? category.name : '홈';

    body.innerHTML = `
        <a class="back-link" href="#/c/${encodeURIComponent(project.category)}">
            ${ICONS.arrowLeft} ${escapeHtml(backLabel)}${toParticle(backLabel)}
        </a>

        <div class="pd-top ${project.shot ? 'pd-top-shot' : ''}">
            <div class="pd-copy">
                <header class="pd-head">
                    <img class="pd-icon" src="${encodeURI(project.icon)}" alt="${escapeHtml(project.title)} 앱 아이콘" width="76" height="76">
                    <div>
                        <h1 class="pd-title">${escapeHtml(project.title)}</h1>
                        ${category ? `<p class="pd-badges"><span class="pd-cat">${escapeHtml(category.name)}</span></p>` : ''}
                    </div>
                </header>
                ${project.headline ? `<p class="pd-headline">${escapeHtml(project.headline)}</p>` : ''}
                <p class="pd-lede">${escapeHtml(project.summary)}</p>
                ${linkKeys.length ? `<div class="pd-links">${linkKeys.map((key, i) =>
                    `<a class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}" href="${encodeURI(links[key])}"
                        target="_blank" rel="noopener noreferrer">${LINK_LABELS[key]}</a>`).join('')}</div>` : ''}
            </div>
            ${project.shot ? `<div class="pd-media">${phone(project, { eager: true })}</div>` : ''}
        </div>

        ${story.why ? `<section class="pd-why">
            <p class="story-q">왜 만들었나</p>
            <p>${escapeHtml(story.why)}</p>
        </section>` : ''}

        <nav class="pd-nav">
            ${prev ? `<a href="#/p/${prev.id}"><span class="pd-nav-label">이전</span>${escapeHtml(prev.title)}</a>` : '<span></span>'}
            ${next ? `<a href="#/p/${next.id}" style="text-align:right"><span class="pd-nav-label">다음</span>${escapeHtml(next.title)}</a>` : '<span></span>'}
        </nav>
    `;
    return true;
}

/**
 * Korean particle for "-(으)로": 로 after a vowel or final ㄹ, 으로 otherwise.
 * Falls back to 으로 for non-Hangul endings.
 */
function toParticle(word) {
    const last = String(word || '').trim().slice(-1);
    const code = last.charCodeAt(0);
    if (!(code >= 0xAC00 && code <= 0xD7A3)) return '으로';
    const finalJamo = (code - 0xAC00) % 28;
    return (finalJamo === 0 || finalJamo === 8) ? '로' : '으로';
}

// =============================================
// INTERACTIONS
// =============================================

/** 꼬리말의 "문의" 링크. 주소는 글자로 보이지 않고 href 로만 들어간다. */
function setupContact() {
    const link = document.getElementById('contactLink');
    if (!link) return;
    link.href = 'mailto:' + contactEmail();
    link.hidden = false;
}

function escapeHtml(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// =============================================
// FALLBACK DATA
// Used only when data/*.json cannot be read. Real entries only.
// The projects below are the App Store releases, kept in step with
// data/projects.json (status "출시").
// =============================================

function getDefaultCategories() {
    // data/categories.json 과 같은 내용. 그 파일을 고치면 여기도 같이 고친다.
    return [
        {"id": "ai", "group": "domain", "name": "AI · 인프라", "vision": "지능을, 손안에.", "lede": "인식과 추론이 기기 안에서 일어납니다. 연결이 끊겨도 생각은 멈추지 않고, 당신의 말과 사진은 당신 곁에 남습니다.", "image": "assets/areas/ai.webp"},
        {"id": "platform", "group": "domain", "name": "플랫폼 · 서비스", "vision": "보이지 않는 곳까지, 단단하게.", "lede": "사람과 사람, 조직 안의 일을 잇는 바탕. 화면 뒤의 구조까지 같은 기준으로 다듬습니다.", "image": "assets/areas/platform.webp"},
        {"id": "fintech", "group": "domain", "name": "핀테크 · 투자", "vision": "숫자를, 읽히게.", "lede": "시세와 가계의 숫자를 누구나 읽을 수 있는 모양으로. 계산은 정확하게, 설명은 간결하게.", "image": "assets/areas/fintech.webp"},
        {"id": "chain", "group": "domain", "name": "블록체인 · 분산", "vision": "신뢰를, 구조로.", "lede": "기록이 서로를 증명하는 방식. 분산된 기술을 일상의 도구로 옮겨 옵니다.", "image": "assets/areas/chain.webp"},
        {"id": "security", "group": "domain", "name": "보안 · 프라이버시", "vision": "모으지 않으면, 새지 않습니다.", "lede": "회원가입도, 서버에 쌓이는 개인정보도 없는 설계. 지키는 가장 좋은 방법은 처음부터 갖지 않는 것입니다.", "image": "assets/areas/security.webp"},
        {"id": "quantum", "group": "domain", "name": "양자보안", "vision": "다음 시대의 암호를, 오늘.", "lede": "양자 컴퓨터가 오는 날에도 오늘의 비밀이 비밀로 남도록. 암호의 다음 세대를 바라봅니다.", "image": "assets/areas/quantum.webp"},
        {"id": "gameai", "group": "domain", "name": "게임 AI", "vision": "생각하는 상대를, 주머니에.", "lede": "바둑과 체스, 장기의 엔진이 휴대폰 안에서 수를 읽습니다. 서버를 부르지 않아도 한 판이 끝까지 이어집니다.", "image": "assets/areas/gameai.webp"},
        {"id": "language", "group": "domain", "name": "언어 · 음성", "vision": "말이, 기기 안에서 풀립니다.", "lede": "받아 적고, 옮기고, 소리 내어 읽는 일. 목소리와 문장은 네트워크 밖으로 나가지 않습니다.", "image": "assets/areas/language.webp"},
        {"id": "media", "group": "domain", "name": "미디어 · 음악", "vision": "화면과 소리를, 원하는 자리로.", "lede": "작은 화면의 영상을 큰 화면으로, 거실을 무대로. 중계 서버 없이 기기와 기기를 잇습니다.", "image": "assets/areas/media.webp"},
        {"id": "care", "group": "domain", "name": "헬스케어", "vision": "매일의 건강을, 조용히 곁에서.", "lede": "재고, 챙기고, 깨우는 일. 기록은 기기 안에만 남고, 큰 글씨와 단순한 조작으로 다듬었습니다.", "image": "assets/areas/care.webp"},
        {"id": "life", "group": "app", "name": "생활·미디어", "vision": "매일 여는 것들.", "lede": "날짜와 길, 음악과 큰 화면. 하루의 가장 가까운 자리에 놓이는 앱."},
        {"id": "work", "group": "app", "name": "업무·생산성", "vision": "일은 덜고, 생각은 더.", "lede": "받아 적고, 정리하고, 건네는 일을 더 가볍게."},
        {"id": "game", "group": "app", "name": "게임·두뇌", "vision": "판 위의 깊이.", "lede": "바둑과 장기, 체스와 오락실, 그리고 도시 하나. 깊게 생각하고 가볍게 즐기는 판."},
        {"id": "learn", "group": "app", "name": "학습·시험", "vision": "배움이 멈추지 않도록.", "lede": "어학과 시험, 기타와 진로까지. 어디서든 이어지는 배움."},
        {"id": "health", "group": "app", "name": "건강·기록", "vision": "몸의 기록은, 당신 곁에.", "lede": "재고, 적고, 한눈에 봅니다. 기록은 기기 안에만 남습니다."},
        {"id": "shop", "group": "app", "name": "쇼핑·가격비교", "vision": "고르는 시간을 짧게.", "lede": "흩어진 값을 한곳에 모아, 조건에 맞는 것만."}
    ];
}

/**
 * The App Store releases, copied from data/projects.json (status "출시").
 * Must stay in step with that file. Story text lives only in the JSON.
 */
function getDefaultProjects() {
    return [
        { id: 1, title: '대한민국 달력', category: 'life', status: '출시',
          summary: '음력·공휴일·간지·절기를 한 화면에서 보는 한국형 달력. 음력 변환과 공휴일 규칙을 서버 없이 기기 안에서 계산해 비행기 모드에서도 동작합니다.',
          icon: 'assets/icons/calendar.png', links: {'appstore':'https://apps.apple.com/app/id6786585716','googleplay':'https://play.google.com/store/apps/details?id=com.modeun.kookmin_calendar'} },
        { id: 2, title: '오늘의 노래', category: 'life', status: '출시',
          summary: '날씨·기분·취향으로 하루에 한 곡을 골라 주는 음악 추천. 국가별 인기 차트를 공개된 음악 정보에서 직접 조합해 자체 서버 없이 운영하고, \'끝까지 듣기\' 한 번이면 추천곡을 유튜브에서 전곡으로 이어 듣습니다.',
          icon: 'assets/icons/song.png', links: {'appstore':'https://apps.apple.com/app/id6785766359','googleplay':'https://play.google.com/store/apps/details?id=com.creativelab.todays_song'} },
        { id: 3, title: 'myTV', category: 'life', status: '출시',
          summary: '웹에서 보던 영상을 스마트TV로 바로 띄워 주는 캐스팅 앱. TV 종류마다 다른 세 가지 연결 방식을 각각 직접 구현해, 화면 미러링이 아니라 원본 스트림을 넘깁니다.',
          icon: 'assets/icons/mytv.png', links: {'appstore':'https://apps.apple.com/app/id6792300908'} },
        { id: 4, title: '음성노트', category: 'work', status: '출시',
          summary: '녹음하면 곧바로 글로 받아 적어 회의록을 만드는 노트. 음성 인식이 전부 기기 안에서 돌아 오디오가 네트워크로 나가지 않고, 인터넷 없이도 동작합니다.',
          icon: 'assets/icons/voicenotes.png', links: {'appstore':'https://apps.apple.com/app/id6795930564'} },
        { id: 5, title: 'Cardly', category: 'work', status: '출시',
          summary: '명함을 찍으면 이름·연락처를 읽어 정리해 주는 명함 관리. 문자 인식을 기기 안에서 처리하고, 연락처 저장과 엑셀 내보내기까지 오프라인으로 끝냅니다.',
          icon: 'assets/icons/cardly.png', links: {'appstore':'https://apps.apple.com/app/id6802890268'} },
        { id: 6, title: 'DailyMap', category: 'life', status: '출시',
          summary: '내 주변 가게·시설을 찾는 가벼운 지도 앱. 누구나 쓸 수 있는 공개 지도를 앱이 직접 조회하고 추천은 2단계로 기기 안에서 처리해, 중계 서버가 아예 없습니다.',
          icon: 'assets/icons/dailymap.png', links: {'appstore':'https://apps.apple.com/app/id6802897224'} },
        { id: 7, title: 'AI 메일답장', category: 'work', status: '출시',
          summary: '받은 메일에 맞는 답장 초안을 대신 써 주는 도구. 무료로 쓸 수 있는 인공지능 두 곳을 이중으로 두고, 둘 다 안 되면 기기 안의 초안 틀로 자동 전환됩니다.',
          icon: 'assets/icons/aiemailreply.png', links: {'appstore':'https://apps.apple.com/app/id6802934901'} },
        { id: 8, title: '증명사진관', category: 'work', status: '출시',
          summary: '사진 한 장을 여권·주민등록증·이력서 등 39가지 규격으로 만들어 주는 증명사진 편집기. 얼굴을 인식해 자동 크롭하고 배경을 단색으로 바꾼 뒤, 머리 높이·눈높이 등 11개 항목을 규격 대비로 점검합니다.',
          icon: 'assets/icons/idphoto.png', links: {'appstore':'https://apps.apple.com/app/id6805292038'} },
        { id: 9, title: '말모이', category: 'learn', status: '출시',
          summary: '외국인을 위한 한국어능력시험(TOPIK) 어휘·발음 학습. 국립국어원 한국어기초사전 어휘 44,391개를 내장하고, 표준 발음법을 규칙 엔진으로 구현했습니다(정확도 94.0%).',
          icon: 'assets/icons/malmoi.png', links: {'appstore':'https://apps.apple.com/app/id6804689666'} },
        { id: 10, title: '코토바', category: 'learn', status: '출시',
          summary: 'JLPT 일본어 단어·한자와 문장 청해를 한 앱에서 연습. 문제 은행과 음성 재생까지 앱에 넣어 계정 없이, 인터넷 없이 학습이 이어집니다.',
          icon: 'assets/icons/kotoba.png', links: {'appstore':'https://apps.apple.com/app/id6804533682'} },
        { id: 11, title: 'Voca 통역', category: 'work', status: '출시',
          summary: '인터넷이 없는 곳에서도 쓰는 대면 통역기. 두 사람이 마주 보고 쓰는 화면과 상황별 회화집을 넣고, 번역 모델을 기기에 올려 오프라인에서 돌립니다.',
          icon: 'assets/icons/voca.png', links: {'appstore':'https://apps.apple.com/app/id6807239009'} },
        { id: 12, title: '유학생활', category: 'life', status: '출시',
          summary: '한국에 온 유학생이 비자·생활 절차를 혼자 처리하도록 돕는 안내 앱. 절차 정보를 앱에 담아 6개 언어로 제공하며, 로그인도 서버 조회도 없습니다.',
          icon: 'assets/icons/studentlife.png', links: {'appstore':'https://apps.apple.com/app/id6807406672'} },
        { id: 13, title: '진로나침반', category: 'learn', status: '출시',
          summary: '성격 유형으로 맞는 전공과 직업을 좁혀 주는 진로 탐색. 검사 결과를 서버로 보내지 않고 기기 안에서 매칭하며 5개 언어를 지원합니다.',
          icon: 'assets/icons/careercompass.png', links: {'appstore':'https://apps.apple.com/app/id6807407170'} },
        { id: 14, title: 'Fretwise', category: 'learn', status: '출시',
          summary: '기타 코드 운지와 코드 진행을 단계별로 익히는 연습 앱. 학습 이론을 그대로 구현한 코치가 오늘 연습할 코드를 골라 줍니다. 전부 기기 안에서 계산합니다.',
          icon: 'assets/icons/fretwise.png', links: {'appstore':'https://apps.apple.com/app/id6797015161'} },
        { id: 15, title: '씽온', category: 'life', status: '출시',
          summary: '폰을 마이크로 써서 거실을 노래방으로 만드는 앱. 음정·박자 등 4개 축으로 채점하고 키를 추천합니다. 서버를 쓰지 않고 단일 페이지 안에서 완결됩니다.',
          icon: 'assets/icons/singon.png', links: {'appstore':'https://apps.apple.com/app/id6801400420'} },
        { id: 16, title: '수담(手談)', category: 'game', status: '출시',
          summary: '인터넷 없이 두는 AI 바둑 — 대국·복기·사활 문제. 공개된 바둑 AI 엔진을 휴대폰 안에 올려 오프라인 대국과 승률 그래프 복기를 돌립니다. 사활 320제 수록.',
          icon: 'assets/icons/sudam.png', links: {'appstore':'https://apps.apple.com/app/id6795918519','googleplay':'https://play.google.com/store/apps/details?id=com.creativelab.sudam'} },
        { id: 17, title: '체스코치', category: 'game', status: '출시',
          summary: '상대 없이도 두고 배우는 체스 대국·퍼즐 앱. 체스 엔진과 퍼즐 1,000문제를 앱에 넣어 서버 호출이 0회입니다. 5개 언어 지원.',
          icon: 'assets/icons/chesscoach.png', links: {'appstore':'https://apps.apple.com/app/id6807283401'} },
        { id: 18, title: 'AI 장기', category: 'game', status: '출시',
          summary: '한국 전통 장기를 정식 규칙 그대로 두는 앱 — 차림 4종·한수쉼·점수제. 규칙을 서로 다른 두 벌로 구현하고 두 결과가 같은지 자동으로 대조해, 규칙 오류가 조용히 새지 않게 막았습니다.',
          icon: 'assets/icons/janggi.png', links: {'appstore':'https://apps.apple.com/app/id6807261608'} },
        { id: 19, title: '또랑', category: 'game', status: '출시',
          summary: '기억력·집중력을 깨우는 어르신용 두뇌 훈련 게임 모음. 큰 글씨와 단순한 조작으로 다시 설계했고 기록은 기기에만 남습니다. 4개 언어 지원.',
          icon: 'assets/icons/ttorang.png', links: {'appstore':'https://apps.apple.com/app/id6802948321'} },
        { id: 20, title: 'Q-City', category: 'game', status: '출시',
          summary: '구역을 놓고 전력·수도·교통·예산을 굴리는 도시 건설 시뮬레이션. 시뮬레이션 로직을 세 벌로 나눠 유지하고 저장 파일이 한 글자까지 같은지 검증합니다. 5개 언어.',
          icon: 'assets/icons/qcity.png', links: {'appstore':'https://apps.apple.com/app/id6811327268'} },
        { id: 21, title: '로또랩', category: 'life', status: '출시',
          summary: '역대 당첨 데이터를 통계로 분석해 번호를 뽑고 관리하는 로또 도우미. 당첨 데이터가 앱에 내장돼 인터넷 없이 분석이 돌아갑니다.',
          icon: 'assets/icons/lottolab.png', links: {'appstore':'https://apps.apple.com/us/app/id6796949878'} },
        { id: 31, title: '혈압수첩', category: 'health', status: '출시',
          summary: '진료 전 7일 동안 아침·저녁 가정혈압을 재도록 안내하고, 의사가 보는 평균을 한 줄로 만들어 주는 기록 수첩. 7·30·90일 평균과 추이를 진료실 화면 하나로 보고, 기록은 기기 안에만 남습니다.',
          icon: 'assets/icons/bpdiary.png', links: {'appstore':'https://apps.apple.com/app/id6813703005'} },
        { id: 34, title: '추억의 오락실', category: 'game', status: '출시',
          summary: '직접 만든 오리지널 아케이드 게임 27종을 모은 오락실(1.1.0). 남의 게임 파일을 쓰지 않고 전부 자작했으며, 광고도 결제도 계정도 없습니다. 175개 지역에서 받을 수 있습니다.',
          icon: 'assets/icons/retroarcade.png', links: {'appstore':'https://apps.apple.com/app/id6814755524'} },
        { id: 72, title: '수담 사활', category: 'game', status: '출시',
          summary: '정답이 하나뿐임을 증명한 바둑 사활 318문제를 입문부터 최상급까지 6단계로 푸는 앱. 1–2단계 106문제는 무료이고, 틀린 문제는 자동으로 모아 다시 풉니다. 광고·회원가입 없이 인터넷 없이 풀립니다.',
          icon: 'assets/icons/tsumego.png', links: {'appstore':'https://apps.apple.com/app/id6815160889'} }
    ];
}

// =============================================
// START
// =============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
