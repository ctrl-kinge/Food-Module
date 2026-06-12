"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, Field, Input, Textarea } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { toast } from "@/lib/toast";

type Item = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: string | null;
  available: boolean;
};

const EMPTY = { name: "", description: "", priceDollars: "", category: "" };

export default function MenuManager({
  isOpen,
  items,
}: {
  isOpen: boolean;
  items: Item[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(isOpen);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function toggleOpen() {
    setBusy(true);
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !open }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not update status");
    setOpen(!open);
    toast.success(!open ? "Restaurant is now open" : "Restaurant is now closed");
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.priceDollars) * 100);
    if (!form.name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
      return toast.error("Enter a name and a price greater than 0");
    }
    setBusy(true);
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        priceCents,
      }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not add item");
    setForm(EMPTY);
    toast.success("Item added");
    router.refresh();
  }

  async function toggleAvailable(item: Item) {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    if (!res.ok) return toast.error("Could not update item");
    router.refresh();
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete item");
    toast.success("Item deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-semibold">
            Status: {open ? "Open" : "Closed"}{" "}
            <Badge tone={open ? "success" : "danger"}>
              {open ? "Accepting orders" : "Not accepting orders"}
            </Badge>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Customers can only order when your restaurant is open.
          </p>
        </div>
        <Button
          variant={open ? "danger" : "primary"}
          loading={busy}
          onClick={toggleOpen}
        >
          {open ? "Close" : "Open"}
        </Button>
      </Card>

      <Card>
        <h2 className="font-semibold">Add an item</h2>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            {({ id }) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
          </Field>
          <Field label="Price (USD)">
            {({ id }) => (
              <Input
                id={id}
                inputMode="decimal"
                placeholder="8.50"
                value={form.priceDollars}
                onChange={(e) =>
                  setForm({ ...form, priceDollars: e.target.value })
                }
              />
            )}
          </Field>
          <Field label="Category (optional)">
            {({ id }) => (
              <Input
                id={id}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            )}
          </Field>
          <Field label="Description (optional)">
            {({ id }) => (
              <Textarea
                id={id}
                rows={1}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy}>
              Add item
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Your menu ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {item.name}{" "}
                      {!item.available && (
                        <Badge tone="neutral">Unavailable</Badge>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.priceCents)}
                      {item.category ? ` · ${item.category}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleAvailable(item)}
                    >
                      {item.available ? "Mark unavailable" : "Mark available"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
