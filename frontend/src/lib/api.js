const CF_HEADERS = {
    "CF-Access-Client-Id": import.meta.env.VITE_CF_CLIENT_ID ?? "",
    "CF-Access-Client-Secret": import.meta.env.VITE_CF_CLIENT_SECRET ?? "",
};

export function apiFetch(path, options = {}) {
    const url = `${import.meta.env.VITE_API_URL}${path}`;
    const headers = { ...CF_HEADERS, ...(options.headers ?? {}) };
    return fetch(url, { ...options, headers });
}
