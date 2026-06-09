import PagePlaceholder from "@/components/PagePlaceholder";

export default function RiderOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PagePlaceholder
      phase="Phase 4"
      title={`Delivery ${params.id}`}
      description="Map with pickup (restaurant) + destination (customer), GPS broadcast, and status controls. Implemented in Phase 4."
    />
  );
}
