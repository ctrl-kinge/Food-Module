"use client";

import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export default function ReorderButton({
  restaurantId,
  restaurantName,
  items,
}: {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
}) {
  const router = useRouter();

  function reorder() {
    useCart.getState().replaceCart(restaurantId, restaurantName, items);
    toast.success("Added to a new cart");
    router.push(`/restaurants/${restaurantId}`);
  }

  return (
    <Button variant="secondary" size="sm" onClick={reorder}>
      Order again
    </Button>
  );
}
