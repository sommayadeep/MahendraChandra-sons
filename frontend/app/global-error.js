'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 560, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2 style={{ fontSize: 28, marginBottom: 12 }}>Application error</h2>
            <p style={{ marginBottom: 20, opacity: 0.8 }}>
              {error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: '10px 14px', border: '1px solid #999', borderRadius: 8 }}
            >
              Reload section
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
