import React, { useEffect, useMemo, useState } from 'react';

type Tint = 'green' | 'yellow' | 'red' | null;

const bulletPoints = [
  'AccessiGo focuses on outdoor accessibility, showing which building entrances are wheelchair-accessible and clearly marking them on an interactive map so students, visitors, and staff can plan routes confidently before they arrive on campus.',
  'The current version highlights the University of Windsor, but the approach is designed to scale across campuses with community-sourced photos and map overlays.',
  'Future iterations will layer in indoor navigation, elevator and ramp details, live status updates, and richer guidance to make every stage of the journey easier to navigate.'
];

const pdfSrc = '/static/img/uw_campus_map.pdf';
const logoSrc = '/static/img/logo.png';
const entranceImgSrc = '/static/img/entrance.jpg';

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
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return previewUrl;
}

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
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus('error');
        setMessage(data.error || 'Upload failed');
        return;
      }

      const parsed = typeof data.score === 'number' ? data.score : 0;
      setScore(parsed);
      let nextTone: Tint = 'green';
      let label: string;
      let description: string;
      if (parsed <= 0.4) {
        nextTone = 'green';
        label = 'Accessible (green)';
        description = '(green) perfectly accessible';
      } else if (parsed < 0.6) {
        nextTone = 'yellow';
        label = 'Somewhat Accessible (yellow)';
        description = '(yellow) somewhat accessible';
      } else {
        nextTone = 'red';
        label = 'Inaccessible (red)';
        description = '(red) HORRIBLE for disabled people';
      }

      setTone(nextTone);
      setMessage(`${label} — ${description}`);
      setStatus('done');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  const reset = () => handleFile(null);

  return (
    <section className="card upload-card" id="upload">
      <h2 className="card__title">Upload an Entrance Photo</h2>
      <p className="muted">Supported formats: PNG, JPG, JPEG, GIF, BMP (max 16MB)</p>
      <form className="upload-form" onSubmit={onSubmit}>
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
          <span>Drag &amp; drop image here or click to browse</span>
        </label>
        <div className="upload-actions">
          <button
            className="btn btn--primary"
            type="submit"
            disabled={!file || status === 'loading'}>
            {status === 'loading' ? 'Uploading...' : 'Upload'}
          </button>
          {file && (
            <button className="btn" type="button" onClick={reset}>
              Clear
            </button>
          )}
        </div>
      </form>
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
            {tone === 'red' ? '✗' : tone ? '✓' : '⚠'}
          </div>
          <div className="result__text">
            <h3 className="result__title">{status === 'error' ? 'Error' : 'Result'}</h3>
            {score !== null && <p className="result__score">Score: {score.toFixed(2)}</p>}
            {message && <p className="result__description muted">{message}</p>}
          </div>
        </div>
      )}
    </section>
  );
};

const App: React.FC = () => {
  const shrink = useNavbarShrink();
  const bulletItems = useMemo(
    () => bulletPoints.map((text, idx) => <li key={idx}>{text}</li>),
    []
  );

  const scrollToUpload = () => {
    window.location.hash = 'upload';
    setTimeout(() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const handleUploadCta = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToUpload();
  };

  const uploadHref = '#upload';

  return (
    <div className="page">
      <nav className={`navbar glass ${shrink ? 'navbar--shrink' : ''}`} id="navbar">
        <div className="navbar__left">
          <a className="logo" href="#top" aria-label="AccessiGo Home">
            <img className="logo__img-square" src={logoSrc} alt="AccessiGo logo" />
            <span className="logo__text">AccessiGo</span>
          </a>
        </div>
        <div className="navbar__right">
          <a className="btn" href="/static/img/uw_campus_map.pdf" target="_blank" rel="noopener noreferrer">
            Map (PDF)
          </a>
          <a className="btn" href="#map">
            Map
          </a>
          <a className="btn btn--primary" href={uploadHref} onClick={handleUploadCta}>
            Upload
          </a>
        </div>
      </nav>

      <main className="container one-col" id="top">
        <header className="hero card">
          <h1 className="hero__title">Welcome to AccessiGo!</h1>
          <p className="hero__subtitle">
            A web app that highlights accessible building entrances around the University of Windsor.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href={uploadHref} onClick={handleUploadCta}>
              Upload an Entrance Photo
            </a>
            <a className="btn btn--ghost" href="#map">
              Jump to Campus Map
            </a>
          </div>
        </header>

        <section className="pdf-section card">
          <h2 className="card__title card__title--xl">Campus Map PDF</h2>
          <details className="accordion" open>
            <summary className="accordion__summary">UWindsor Campus Map (PDF) — click to expand</summary>
            <div className="accordion__body">
              <div className="pdf-embed glass-inset">
                <iframe title="UWindsor Campus Map PDF" src={pdfSrc} loading="lazy"></iframe>
              </div>
            </div>
          </details>
        </section>

        <section className="card info-block">
          <h2 className="card__title card__title--xl info-block__title">Why AccessiGo</h2>
          <div className="info-block__text">
            <ul className="bullet-list">{bulletItems}</ul>
          </div>
          <div className="info-block__badge glass-inset">
            <img className="info-block__logo" src={logoSrc} alt="Accessibility logo" />
            <p className="info-block__label">Accessibility-first</p>
          </div>
        </section>

        <section className="card image-card">
          <h2 className="card__title card__title--xl">Accessible Entrance Example</h2>
          <div className="media-wrap glass-inset">
            <img className="media-wrap__img" src={entranceImgSrc} alt="Accessible entrance example" />
          </div>
          <p className="image-block__caption">Example of a clearly marked accessible entrance.</p>
        </section>

        <section className="map-section card" id="map">
          <h2 className="card__title card__title--xl">Interactive Campus Map</h2>
          <div className="media-wrap glass-inset">
            <iframe
              className="map-frame"
              title="University of Windsor Map"
              src="https://www.google.com/maps?q=University+of+Windsor,401+Sunset+Avenue+Windsor+ON&output=embed"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </section>

        <UploadCard />
      </main>
    </div>
  );
};

export default App;
