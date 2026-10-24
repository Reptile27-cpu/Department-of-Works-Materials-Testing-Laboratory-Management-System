export function resolveApiUrl(endpointUrl: string): string {
  if (endpointUrl.startsWith('http://') || endpointUrl.startsWith('https://')) {
    return endpointUrl;
  }
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
  const pathPart = endpointUrl.startsWith('/') ? endpointUrl : `/${endpointUrl}`;
  if (base.endsWith('/api/v1')) {
    return `${base}${pathPart.replace(/^\/api\/v1/, '')}`;
  }
  const normalizedPath = pathPart.startsWith('/api/v1') ? pathPart : `/api/v1${pathPart}`;
  return `${base}${normalizedPath}`;
}

/**
 * Downloads a test form or bundle PDF file with proper authentication headers.
 */
export async function downloadTestFormPdf(endpointUrl: string, defaultFilename: string): Promise<void> {
  try {
    const url = resolveApiUrl(endpointUrl);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'download=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF (${response.status}: ${response.statusText})`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err: any) {
    console.error('Download error:', err);
    alert(`Could not download PDF: ${err.message || 'Network error'}`);
  }
}

/**
 * Prints a clean, native PDF document via a hidden iframe (not a webpage screenshot).
 */
export async function printTestFormPdf(endpointUrl: string): Promise<void> {
  try {
    const url = resolveApiUrl(endpointUrl);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load PDF for printing (${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print iframe trigger error:', e);
          window.open(blobUrl, '_blank');
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(blobUrl);
          }, 60000);
        }
      }, 500);
    };
  } catch (err: any) {
    console.error('Print error:', err);
    alert(`Could not print document: ${err.message || 'Error loading PDF'}`);
  }
}

/**
 * Fetches a blob URL for inline previewing.
 */
export async function getTestFormPreviewUrl(endpointUrl: string): Promise<string> {
  const url = resolveApiUrl(endpointUrl);
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to load PDF preview (${response.status})`);
  }

  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}
