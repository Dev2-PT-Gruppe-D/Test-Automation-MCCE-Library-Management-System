const BASE_URL = process.env.SUT_BASE_URL || 'http://localhost:3000';

async function request(method, path, body) {
  const hasBody = body !== undefined && body !== null;
  const res = await fetch(BASE_URL + path, {
    method,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined
  });

  // 204 No Content (and any empty body) parses to null instead of throwing.
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  return { status: res.status, body: parsed, headers: res.headers };
}

module.exports = {
  BASE_URL,
  request,
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path)
};
