import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FLOOR_ORDER } from "@/lib/nav/engine";
import { checkAdmin, deleteQrPoint, getQrPoints, saveQrPoint, type QrPointDTO } from "@/lib/qrFns";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — DTU Guide" }] }),
  component: Admin,
});

const emptyForm = { original: "", code: "", name: "", floor: FLOOR_ORDER[0]?.id ?? "ab4-1", node: "" };

function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      await checkAdmin({ data: { password } });
      setAuthed(true);
    } catch {
      setLoginError("Incorrect password.");
    }
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <form onSubmit={login} className="w-full max-w-xs rounded-[12px] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="text-sm font-semibold tracking-tight">DTU Guide · Admin</h1>
          <p className="mt-1 text-xs text-muted-foreground">Enter the admin password to manage checkpoints.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="mt-4 h-10 w-full rounded-[8px] border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {loginError && <p className="mt-2 text-xs text-[color:var(--error)]">{loginError}</p>}
          <Button type="submit" variant="pixel" size="pixel" className="mt-4 w-full">
            Sign in
          </Button>
        </form>
      </main>
    );
  }

  return <AdminPanel password={password} />;
}

function AdminPanel({ password }: { password: string }) {
  const qc = useQueryClient();
  const { data: points = [] } = useQuery({ queryKey: ["qrPoints"], queryFn: () => getQrPoints() });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => saveQrPoint({ data: { password, ...form } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qrPoints"] });
      setForm(emptyForm);
      setError("");
    },
    onError: (e) => setError(String((e as Error).message)),
  });

  const remove = useMutation({
    mutationFn: (code: string) => deleteQrPoint({ data: { password, code } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qrPoints"] }),
  });

  const editing = Boolean(form.original);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Checkpoints admin</h1>
            <p className="text-xs text-muted-foreground">{points.length} checkpoints · edits go live instantly</p>
          </div>
          <a href="/qr-codes" className="text-xs text-primary underline-offset-4 hover:underline">
            Printable codes →
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-6">
        {/* add / edit form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mb-6 rounded-[10px] border border-border bg-card p-4"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {editing ? `Edit ${form.original}` : "Add checkpoint"}
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <input required value={form.code} onChange={set("code")} placeholder="Code (AB4-1-30)" className="input h-9 rounded-[8px] border border-border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <input required value={form.name} onChange={set("name")} placeholder="Name" className="h-9 rounded-[8px] border border-border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2" />
            <select value={form.floor} onChange={set("floor")} className="h-9 rounded-[8px] border border-border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {FLOOR_ORDER.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input required value={form.node} onChange={set("node")} placeholder="Node id (from /qr-editor)" className="h-9 rounded-[8px] border border-border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-3" />
            <div className="flex gap-2">
              <Button type="submit" variant="pixel" size="pixel" disabled={save.isPending} className="flex-1">
                {editing ? "Update" : "Add"}
              </Button>
              {editing && (
                <Button type="button" variant="pixelOutline" size="pixel" onClick={() => setForm(emptyForm)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-[color:var(--error)]">{error}</p>}
        </form>

        {/* list */}
        <div className="overflow-hidden rounded-[10px] border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Floor</th>
                <th className="px-3 py-2 font-medium">Node</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {points.map((q: QrPointDTO) => (
                <tr key={q.code} className="hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs">{q.code}</td>
                  <td className="px-3 py-2">{q.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{q.floor}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{q.node}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setForm({ original: q.code, code: q.code, name: q.name, floor: q.floor, node: q.node })}
                      className="mr-3 text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(q.code)}
                      className="text-xs text-[color:var(--error)] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
