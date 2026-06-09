import PagePlaceholder from "@/components/PagePlaceholder";

export default function RestaurantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PagePlaceholder
      phase="Phase 2"
      title={`Restaurant ${params.id}`}
      description="Menu + cart and checkout. Implemented in Phase 2."
    />
  );
}
