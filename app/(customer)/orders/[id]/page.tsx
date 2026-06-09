import PagePlaceholder from "@/components/PagePlaceholder";

export default function OrderTrackingPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PagePlaceholder
      phase="Phase 3-5"
      title={`Order ${params.id}`}
      description="Live tracking map, traffic-aware ETA, status stepper, and post-delivery reviews/tips. Built across Phases 3-5."
    />
  );
}
