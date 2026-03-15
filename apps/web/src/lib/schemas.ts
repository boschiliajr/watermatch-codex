import { z } from "zod";

export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ deve conter 14 digitos");

const ufSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .refine((v) => /^[A-Z]{2}$/.test(v), "UF invalida");

const idSchema = z.string().uuid("ID invalido");

export const createCompanySchema = z.object({
  cnpj: cnpjSchema,
  razao_social: z.string().trim().min(2, "Razao social obrigatoria"),
  municipio: z.string().trim().min(2, "Municipio obrigatorio"),
  uf: ufSchema,
  tags_produtos_servicos: z.array(z.string().trim().min(1)).default([])
});

export const createMunicipalitySchema = z.object({
  cnpj: cnpjSchema,
  nome_prefeitura: z.string().trim().min(2, "Nome da prefeitura obrigatorio"),
  municipio: z.string().trim().min(2, "Municipio obrigatorio"),
  uf: ufSchema
});

export const createDemandSchema = z.object({
  municipality_id: idSchema,
  descricao_problema: z.string().trim().min(5, "Descricao muito curta"),
  status: z.enum(["open", "aberta", "matched", "closed"]).default("open")
});

export const createProjectSchema = z.object({
  match_id: idSchema,
  titulo: z.string().trim().min(3, "Titulo obrigatorio"),
  resumo: z.string().trim().optional().nullable(),
  valor_custo_empresa: z.number().finite().nonnegative(),
  margem_pit_percentual: z.number().finite().min(0).max(1000)
});

export const deleteByIdSchema = z.object({
  id: idSchema
});

