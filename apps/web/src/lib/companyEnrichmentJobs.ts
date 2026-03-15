import { supabaseServer } from "@/lib/supabaseServer";

export async function enqueueCompanyEnrichment(params: {
  companyId: string;
  input: Record<string, unknown>;
}) {
  const { data, error } = await supabaseServer
    .from("company_enrichment_jobs")
    .insert({
      company_id: params.companyId,
      status: "pending",
      attempts: 0,
      input_snapshot: params.input
    })
    .select("id, status")
    .single();

  if (error) throw new Error(error.message);
  return {
    jobId: String((data as any).id),
    status: String((data as any).status)
  };
}
