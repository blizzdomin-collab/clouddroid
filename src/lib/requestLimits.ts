export const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

export function checkRequestSize(request: Request): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
    return { valid: false, error: 'Request too large. Maximum size is 1MB.' };
  }
  return { valid: true };
}
