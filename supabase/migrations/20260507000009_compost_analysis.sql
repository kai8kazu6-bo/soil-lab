-- =============================================================
--  soilラボ レポート分析値の拡張：堆肥/スラリーにも対応
--
--  - resource_type: 'soil' / 'solid_compost' / 'liquid_slurry'
--  - cn_ratio, moisture, ec, ammonia_ppm, ammonia_ratio を追加
--  - 既存の土壌分析（pH, CEC, 腐植, N, P, K, 微生物）はそのまま流用
-- =============================================================

alter table public.report_analyses
  add column if not exists resource_type text not null default 'soil'
    check (resource_type in ('soil', 'solid_compost', 'liquid_slurry')),
  add column if not exists cn_ratio       numeric(5,2),
  add column if not exists moisture       numeric(4,1),
  add column if not exists ec             numeric(4,2),
  add column if not exists ammonia_ppm    numeric(8,1),
  add column if not exists ammonia_ratio  numeric(4,1);

comment on column public.report_analyses.resource_type is
  '分析対象の資材種別。soil=土壌 / solid_compost=固体堆肥 / liquid_slurry=液体スラリー';
comment on column public.report_analyses.cn_ratio is '炭素率 (C/N比)';
comment on column public.report_analyses.moisture is '水分 (%)';
comment on column public.report_analyses.ec is '電気伝導度 (ms/cm)';
comment on column public.report_analyses.ammonia_ppm is '固体堆肥用：アンモニア態窒素 (乾物中 ppm)';
comment on column public.report_analyses.ammonia_ratio is '液体スラリー用：全窒素に対するアンモニア態窒素の割合 (%)';

create index if not exists report_analyses_resource_type_idx
  on public.report_analyses (resource_type);
