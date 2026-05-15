export const api = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `${res.status} ${res.statusText}`);
    }
    return (await res.json()).data;
  }
};
