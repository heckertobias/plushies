export type Plushie = {
  id: number;
  name: string;
  birthday: string; // YYYY-MM-DD
  origin: string | null;
  notes: string | null;
  photoPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlushieInput = {
  name: string;
  birthday: string;
  origin?: string;
  notes?: string;
};

const BASE = "/api/plushies";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  list: () => fetch(BASE).then((r) => json<Plushie[]>(r)),

  get: (id: number) => fetch(`${BASE}/${id}`).then((r) => json<Plushie>(r)),

  create: (data: PlushieInput) =>
    fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Plushie>(r)),

  update: (id: number, data: Partial<PlushieInput>) =>
    fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Plushie>(r)),

  delete: (id: number) =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
    }),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return fetch(`${BASE}/${id}/photo`, { method: "POST", body: form }).then((r) =>
      json<{ photoUrl: string }>(r)
    );
  },
};
