
export interface TankDimensions {
  en: number;
  boy: number;
  yukseklik: number;
}

export interface KatGirdisi {
  kat_no: number;
  secilen_sac_kalinligi_mm: number;
  kat_modul_sayisi: number;
}

export type DepoTipi = 'galvaniz' | 'paslanmaz';

export interface CalculationInputs {
  depo_en: number;
  depo_boy: number;
  depo_yukseklik: number;
  depo_adedi: number;
  depo_tipi: DepoTipi;
  sac_kg_fiyatlari: Record<string, number>;
  iscilik_birim_maliyeti: number;
  montaj_birim_maliyeti_tekli: number;
  montaj_birim_maliyeti_toplu: number;
  plastik_kaide_birim_maliyeti: number;
  merdiven_adedi: number;
  merdiven_birim_maliyeti: number;
  manson_toplam_maliyeti: number;
  kat_detaylari: KatGirdisi[];
  // Proposal Fields
  kar_orani_yuzde?: number;
  iskonto_yuzde?: number;
  kdv_yuzde?: number;
  para_birimi?: string;
  teslim_suresi_gun?: number;
  teklif_gecerlilik_gun?: number;
  musteri_adi?: string;
  proje_adi?: string;
  teklif_no?: string;
  teklif_tarihi?: string;
}

export interface KatDetayCiktisi {
  kat_no: number;
  sac_kalinligi: number;
  modul_sayisi: number;
  toplam_agirlik_kg: number;
  kat_maliyeti: number;
}

export interface CalculationResult {
  olcu_dogrulama: boolean;
  depo_hacmi_m3: number;
  su_kapasitesi_ton: number;
  toplam_modul_sayisi: number;
  taban_modul_sayisi: number;
  kat_detaylari: KatDetayCiktisi[];
  toplam_hammadde_maliyeti: number;
  toplam_iscilik_maliyeti: number;
  toplam_montaj_maliyeti: number;
  toplam_plastik_kaide_maliyeti: number;
  merdiven_maliyeti: number;
  manson_maliyeti: number;
  genel_toplam_maliyet: number;
  // Proposal Output
  teklif_ozeti?: {
    teklif_no: string;
    teklif_tarihi: string;
    musteri_adi: string;
    proje_adi: string;
    depo_olculeri: string;
    depo_tipi_etiket: string;
    su_kapasitesi_ton: number;
    kullanilan_modul_bilgisi: string;
    sac_kalinlik_ozeti: string;
    toplam_maliyet: number;
    kar_orani_yuzde: number;
    satis_bedeli: number;
    iskonto_yuzde: number;
    iskonto_tutari: number;
    iskontolu_bedel: number;
    kdv_yuzde: number;
    kdv_tutari: number;
    genel_toplam_teklif: number;
    para_birimi: string;
    teslim_suresi_gun: number;
    teklif_gecerlilik_gun: number;
  };
  error?: string;
}
