'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <h2 className="text-2xl font-semibold mb-3">Something went wrong</h2>
        <p className="text-sm opacity-80 mb-6">
          Please try again. If the issue continues, refresh the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 border rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
