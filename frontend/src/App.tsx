import React, { useEffect, useMemo, useState } from 'react';

type Tint = 'green' | 'yellow' | 'red' | null;

const pdfSrc = '/static/img/uw_campus_map.pdf';
const logoSrc = '/static/img/logo.png';
const campusImgSrc = '/static/img/entrance.jpg';

const homeNavItems = [
  { label: 'Why AccessiGo', href: '#why' },
  { label: 'Roadmap', href: '#roadmap' }
];

const uploadNavItems = [
  { label: 'Photo Check', href: '#upload' },
  { label: 'Campus Map', href: '#map' }
];

const proofPoints = [
  'University of Windsor campus pilot',
  'Entrance photo accessibility scoring',
  'Outdoor routes now, indoor guidance next'
];

const featurePoints = [
  {
    title: 'Accessible entrances shown clearly',
    text:
      'AccessiGo focuses on the part of a trip that campus maps often skip: which entrance is actually wheelchair-accessible. Entrances can be marked, compared, and checked before someone arrives.'
  },
  {
    title: 'Built around real campus movement',
    text:
      'The first version centers on outdoor accessibility at the University of Windsor so students, staff, and visitors can plan practical routes between buildings, parking, sidewalks, ramps, and doors.'
  },
  {
    title: 'Photos help keep access data current',
    text:
      'Community-sourced entrance photos can be uploaded and reviewed with a quick accessibility signal, helping the map improve as buildings, pathways, and temporary barriers change.'
  },
  {
    title: 'Designed to scale past one campus',
    text:
      'The same workflow can expand to other schools with local map overlays, entrance details, verified photos, and accessibility metadata that is useful beyond a single PDF map.'
  }
];

const entranceCards = [
  {
    name: 'CAW Student Centre',
    detail: 'Level approach, automatic doors',
    status: 'Accessible',
    meta: 'Updated from campus photo'
  },
  {
    name: 'Leddy Library',
    detail: 'Ramp nearby, check west doors',
    status: 'Review',
    meta: 'Needs clearer entrance photo'
  },
  {
    name: 'Odette School of Business',
    detail: 'Marked exterior accessible route',
    status: 'Accessible',
    meta: 'Outdoor route ready'
  }
];

const roadmapItems = [
  {
    title: 'Indoor navigation',
    text: 'Add elevator, ramp, hallway, washroom, and floor-by-floor route guidance after the outdoor entrance layer is reliable.'
  },
  {
    title: 'Live entrance status',
    text: 'Flag construction, locked doors, weather issues, blocked ramps, and other temporary barriers that can change a route.'
  },
  {
    title: 'Richer accessibility metadata',
    text: 'Track door type, slope, curb cuts, surface quality, nearby parking, lighting, and confidence level for each entrance.'
  }
];

function useNavbarShrink(threshold = 10) {
  const [shrink, setShrink] = useState(false);

  useEffect(() => {
    const onScroll = () => setShrink(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return shrink;
}

function usePreview(file: File | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return previewUrl;
}

const LogoLockup: React.FC = () => (
  <a className="logo" href="/" aria-label="AccessiGo home">
    <img className="logo__img-square" src={logoSrc} alt="AccessiGo logo" />
    <span className="logo__text">AccessiGo</span>
  </a>
);

const ProductPreview: React.FC = () => (
  <section className="product-preview" aria-label="AccessiGo campus accessibility preview">
    <aside className="preview-sidebar">
      <div className="preview-brand">
        <img src={logoSrc} alt="" />
        <strong>AccessiGo</strong>
      </div>
      <div className="preview-nav-item preview-nav-item--active">Entrances</div>
      <div className="preview-nav-item">Routes</div>
      <div className="preview-nav-item">Photos</div>
      <div className="preview-nav-item">Reports</div>
    </aside>

    <div className="preview-main">
      <div className="preview-topbar">
        <div>
          <strong>Accessible Entrances</strong>
          <span>University of Windsor campus</span>
        </div>
        <button className="preview-faq" type="button">FAQ</button>
      </div>

      <div className="preview-search">
        <span aria-hidden="true" className="search-icon" />
        <span>Search buildings, entrances, or routes</span>
        <button type="button">Save view</button>
      </div>

      <div className="preview-filters" aria-label="Sample map filters">
        <span>Outdoor</span>
        <span>Wheelchair access</span>
        <span>Photo verified</span>
        <span>Open now</span>
      </div>

      <div className="preview-content">
        <div className="entrance-list">
          {entranceCards.map((card) => (
            <article className="entrance-card" key={card.name}>
              <div className="entrance-card__mark" aria-hidden="true">A</div>
              <div>
                <h3>{card.name}</h3>
                <p>{card.detail}</p>
                <span>{card.meta}</span>
              </div>
              <strong className={card.status === 'Accessible' ? 'status-good' : 'status-review'}>
                {card.status}
              </strong>
            </article>
          ))}
        </div>

        <div className="mini-map" aria-label="Stylized campus map with accessible entrance pins">
          <div className="map-road map-road--one" />
          <div className="map-road map-road--two" />
          <div className="map-road map-road--three" />
          <span className="map-pin map-pin--one" />
          <span className="map-pin map-pin--two" />
          <span className="map-pin map-pin--three" />
          <div className="map-card">
            <strong>CAW entrance</strong>
            <span>Barrier-free route found</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const UploadCard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<Tint>(null);
  const [score, setScore] = useState<number | null>(null);
  const previewUrl = usePreview(file);

  const handleFile = (f: File | null) => {
    setFile(f);
    setMessage(null);
    setTone(null);
    setScore(null);
    setStatus('idle');
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('loading');
    setMessage(null);
    setTone(null);
    setScore(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus('error');
        setMessage(data.error || 'Upload failed');
        return;
      }

      const parsed = typeof data.score === 'number' ? data.score : 0;
      setScore(parsed);

      if (parsed <= 0.4) {
        setTone('green');
        setMessage('Looks accessible. The entrance appears to have a clear, barrier-free approach.');
      } else if (parsed < 0.6) {
        setTone('yellow');
        setMessage('Review with caution. Check slope, curb cuts, nearby ramps, and door clearance before relying on this route.');
      } else {
        setTone('red');
        setMessage('Likely inaccessible. The photo may show barriers that make wheelchair access difficult.');
      }

      setStatus('done');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const reset = () => handleFile(null);

  return (
    <section className="upload-card" id="upload">
      <div className="section-copy">
        <span className="section-label">Photo check</span>
        <h2>Check an entrance photo in seconds.</h2>
        <p>
          Upload a campus entrance image and AccessiGo returns a quick accessibility signal. Use it
          as an early warning before adding details to the map or choosing a route.
        </p>
      </div>

      <form className="upload-panel" onSubmit={onSubmit}>
        <label
          htmlFor="file"
          className="file-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onDragEnter={(e) => e.preventDefault()}>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <strong>Drop an entrance photo here</strong>
          <span>PNG, JPG, JPEG, GIF, or BMP up to 16MB</span>
        </label>

        <div className="upload-actions">
          <button className="btn btn--primary" type="submit" disabled={!file || status === 'loading'}>
            {status === 'loading' ? 'Analyzing...' : 'Analyze Photo'}
          </button>
          {file && (
            <button className="btn btn--secondary" type="button" onClick={reset}>
              Clear
            </button>
          )}
        </div>

        {previewUrl && (
          <div className={`preview ${tone ? 'preview--show' : ''}`}>
            <img
              src={previewUrl}
              alt="Preview"
              className={[
                tone === 'green' ? 'border--green' : '',
                tone === 'yellow' ? 'border--yellow' : '',
                tone === 'red' ? 'border--red' : ''
              ].join(' ')}
            />
          </div>
        )}

        {(status === 'done' || status === 'error') && (
          <div
            className={[
              'result',
              tone === 'green' ? 'result--green' : '',
              tone === 'yellow' ? 'result--yellow' : '',
              tone === 'red' ? 'result--red' : ''
            ].join(' ')}>
            <div className="result__icon" aria-hidden="true">
              {tone === 'red' ? 'X' : tone ? 'OK' : '!'}
            </div>
            <div className="result__text">
              <h3 className="result__title">{status === 'error' ? 'Upload issue' : 'Accessibility signal'}</h3>
              {score !== null && <p className="result__score">Score: {score.toFixed(2)}</p>}
              {message && <p className="result__description">{message}</p>}
            </div>
          </div>
        )}
      </form>
    </section>
  );
};

const WhySection: React.FC = () => {
  const featureItems = useMemo(
    () =>
      featurePoints.map((item) => (
        <li key={item.title}>
          <strong>{item.title}</strong>
          <span>{item.text}</span>
        </li>
      )),
    []
  );

  return (
    <section className="split-section" id="why">
      <div className="section-copy">
        <span className="section-label">Why AccessiGo</span>
        <h2>Plan the entrance, not just the destination.</h2>
        <p>
          Traditional campus maps can get someone to a building, but they rarely explain which
          door is usable, where the ramp starts, or whether an entrance photo is current. AccessiGo
          turns those details into a clearer accessibility layer.
        </p>
        <ul className="feature-list">{featureItems}</ul>
      </div>

      <aside className="campus-panel" aria-label="Campus accessibility summary">
        <img src={campusImgSrc} alt="University of Windsor campus" />
        <div className="campus-panel__content">
          <strong>Outdoor accessibility first</strong>
          <p>
            Start with entrances, sidewalks, ramps, and exterior routes. Then expand indoors once
            the most visible access barriers are documented.
          </p>
          <div className="metric-grid">
            <div>
              <span>01</span>
              <strong>Map the entrance</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Verify with photos</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Guide the route</strong>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
};

const MapSection: React.FC = () => (
  <section className="map-section" id="map">
    <div className="section-copy section-copy--center">
      <span className="section-label">Campus map</span>
      <h2>Browse the University of Windsor accessibility layer.</h2>
      <p>
        Use the embedded campus map as a starting point, then pair it with entrance photos and
        accessibility notes so routes are planned around real access needs.
      </p>
      <a className="btn btn--secondary" href={pdfSrc} target="_blank" rel="noopener noreferrer">
        Open Campus PDF
      </a>
    </div>
    <div className="map-frame-wrap">
      <iframe
        className="map-frame"
        title="University of Windsor Map"
        src="https://www.google.com/maps?q=University+of+Windsor,401+Sunset+Avenue+Windsor+ON&output=embed"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </section>
);

const RoadmapSection: React.FC = () => (
  <section className="roadmap-section" id="roadmap">
    <div className="section-copy">
      <span className="section-label">Roadmap</span>
      <h2>Designed for a more complete access network.</h2>
    </div>
    <div className="roadmap-grid">
      {roadmapItems.map((item, index) => (
        <article className="roadmap-card" key={item.title}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  </section>
);

const HomePage: React.FC = () => (
  <main>
    <section className="hero">
      <div className="hero__copy">
        <h1>
          <span className="hero-title-line hero-title-line--desktop">Find accessible entrances</span>
          <span className="hero-title-line hero-title-line--mobile">Find accessible</span>
          <span className="hero-title-line hero-title-line--mobile">entrances</span>
          <span>before you go.</span>
        </h1>
        <p>
          AccessiGo helps students, staff, and visitors find wheelchair-accessible building
          entrances at the University of Windsor, verify entrance photos, and plan outdoor routes
          with fewer surprises.
        </p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="/upload#map">Explore Campus Map</a>
          <a className="btn btn--secondary" href="/upload#upload">
            Check a Photo
          </a>
        </div>
      </div>

      <div className="proof-row" aria-label="AccessiGo highlights">
        {proofPoints.map((point) => (
          <div className="proof-item" key={point}>
            <span aria-hidden="true" />
            <strong>{point}</strong>
          </div>
        ))}
      </div>

      <ProductPreview />
    </section>

    <WhySection />
    <RoadmapSection />
  </main>
);

const UploadPage: React.FC = () => (
  <main className="upload-page">
    <UploadCard />
    <MapSection />
  </main>
);

const App: React.FC = () => {
  const shrink = useNavbarShrink();
  const isUploadPage = window.location.pathname.startsWith('/upload');
  const navItems = isUploadPage ? uploadNavItems : homeNavItems;

  return (
    <div className="page" id="top">
      <nav className={`navbar ${shrink ? 'navbar--shrink' : ''}`} id="navbar">
        <LogoLockup />
        <div className="navbar__links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </div>
        <a className="btn btn--primary navbar__cta" href={isUploadPage ? '/' : '/upload'}>
          {isUploadPage ? 'Home' : 'Upload Photo'}
        </a>
      </nav>

      {isUploadPage ? <UploadPage /> : <HomePage />}
    </div>
  );
};

export default App;
