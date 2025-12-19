
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TankDimensions, 
  CalculationInputs, 
  CalculationResult, 
  KatGirdisi,
  DepoTipi
} from './types';
import { 
  MODULE_SIZE, 
  THICKNESS_OPTIONS,
  SAC_AGIRLIK_TABLOSU
} from './constants';
import { calculateCosts } from './geminiService';
import InputGroup from './components/InputGroup';

type Currency = 'TL' | 'USD' | 'EUR';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TL: '₺',
  USD: '$',
  EUR: '€'
};

const EXCHANGE_RATES: Record<Currency, number> = {
  TL: 1,
  USD: 33.85,
  EUR: 36.42
};

// Fix: Added missing dimension options based on MODULE_SIZE (1080mm)
const enBoyOptions = [1080, 2160, 3240, 4320, 5400, 6480, 7560, 8640, 9720, 10800, 11880, 12960];
const yukseklikOptions = [1080, 2160, 3240, 4320, 5400];

const App: React.FC = () => {
  const [currency, setCurrency] = useState<Currency>('TL');
  const [activeTab, setActiveTab] = useState<'calc' | 'proposal'>('calc');
  const prevCurrencyRef = useRef<Currency>('TL');

  const [depoTipi, setDepoTipi] = useState<DepoTipi>('galvaniz');
  const [depoAdedi, setDepoAdedi] = useState<number>(1);
  const [dimensions, setDimensions] = useState<TankDimensions>({
    en: 2160,
    boy: 3240,
    yukseklik: 2160
  });

  // Separate prices for Galvanized and Stainless
  const [galvanizPrices, setGalvanizPrices] = useState<Record<string, number>>(
    THICKNESS_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr.toString()]: 35 }), {})
  );
  const [paslanmazPrices, setPaslanmazPrices] = useState<Record<string, number>>(
    THICKNESS_OPTIONS.reduce((acc, curr) => ({ ...acc, [curr.toString()]: 95 }), {})
  );

  const [costs, setCosts] = useState({
    iscilik_birim_maliyeti: 150,
    montaj_birim_maliyeti_tekli: 250,
    montaj_birim_maliyeti_toplu: 200,
    plastik_kaide_birim_maliyeti: 45,
    merdiven_adedi: 1,
    merdiven_birim_maliyeti: 1200,
    manson_toplam_maliyeti: 500
  });

  const [proposalParams, setProposalParams] = useState({
    kar_orani_yuzde: 25,
    iskonto_yuzde: 0,
    kdv_yuzde: 20,
    teslim_suresi_gun: 15,
    teklif_gecerlilik_gun: 30,
    musteri_adi: '',
    proje_adi: '',
    teklif_no: `TKF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    teklif_tarihi: new Date().toISOString().split('T')[0]
  });

  const [selectedThicknesses, setSelectedThicknesses] = useState<Record<number, number>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);

  // Handlers
  const handleDimensionSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDimensions(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    setResult(null);
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCosts(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    setResult(null);
  };

  const handleThicknessChange = (kat_no: number, value: string) => {
    setSelectedThicknesses(prev => ({ ...prev, [kat_no]: parseFloat(value) }));
    setResult(null);
  };

  const handleProposalParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setProposalParams(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (parseFloat(value) || 0) : value 
    }));
  };

  const handleDepoAdediChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 1;
    setDepoAdedi(val < 1 ? 1 : val);
    setResult(null);
  };

  const handleSacPriceChange = (thickness: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (depoTipi === 'galvaniz') {
      setGalvanizPrices(prev => ({ ...prev, [thickness]: numValue }));
    } else {
      setPaslanmazPrices(prev => ({ ...prev, [thickness]: numValue }));
    }
    setResult(null);
  };

  // Currency conversion effect
  useEffect(() => {
    if (prevCurrencyRef.current === currency) return;
    const factor = EXCHANGE_RATES[prevCurrencyRef.current] / EXCHANGE_RATES[currency];

    const convertPrices = (prices: Record<string, number>) => {
      const updated = { ...prices };
      Object.keys(updated).forEach(k => updated[k] = Number((updated[k] * factor).toFixed(2)));
      return updated;
    };

    setGalvanizPrices(prev => convertPrices(prev));
    setPaslanmazPrices(prev => convertPrices(prev));

    setCosts(prev => ({
      ...prev,
      iscilik_birim_maliyeti: Number((prev.iscilik_birim_maliyeti * factor).toFixed(2)),
      montaj_birim_maliyeti_tekli: Number((prev.montaj_birim_maliyeti_tekli * factor).toFixed(2)),
      montaj_birim_maliyeti_toplu: Number((prev.montaj_birim_maliyeti_toplu * factor).toFixed(2)),
      plastik_kaide_birim_maliyeti: Number((prev.plastik_kaide_birim_maliyeti * factor).toFixed(2)),
      merdiven_birim_maliyeti: Number((prev.merdiven_birim_maliyeti * factor).toFixed(2)),
      manson_toplam_maliyeti: Number((prev.manson_toplam_maliyeti * factor).toFixed(2)),
    }));

    if (result) {
      setResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          toplam_hammadde_maliyeti: prev.toplam_hammadde_maliyeti * factor,
          toplam_iscilik_maliyeti: prev.toplam_iscilik_maliyeti * factor,
          toplam_montaj_maliyeti: prev.toplam_montaj_maliyeti * factor,
          toplam_plastik_kaide_maliyeti: prev.toplam_plastik_kaide_maliyeti * factor,
          merdiven_maliyeti: prev.merdiven_maliyeti * factor,
          manson_maliyeti: prev.manson_maliyeti * factor,
          genel_toplam_maliyet: prev.genel_toplam_maliyet * factor,
          kat_detaylari: (prev.kat_detaylari || []).map(kd => ({
            ...kd,
            kat_maliyeti: kd.kat_maliyeti * factor
          })),
          teklif_ozeti: prev.teklif_ozeti ? {
            ...prev.teklif_ozeti,
            toplam_maliyet: prev.teklif_ozeti.toplam_maliyet * factor,
            satis_bedeli: prev.teklif_ozeti.satis_bedeli * factor,
            iskonto_tutari: prev.teklif_ozeti.iskonto_tutari * factor,
            iskontolu_bedel: prev.teklif_ozeti.iskontolu_bedel * factor,
            kdv_tutari: prev.teklif_ozeti.kdv_tutari * factor,
            genel_toplam_teklif: prev.teklif_ozeti.genel_toplam_teklif * factor
          } : undefined
        };
      });
    }
    prevCurrencyRef.current = currency;
  }, [currency, result]);

  const floors = useMemo(() => {
    const list: KatGirdisi[] = [];
    const enMod = dimensions.en / MODULE_SIZE;
    const boyMod = dimensions.boy / MODULE_SIZE;
    const floorCount = Math.floor(dimensions.yukseklik / MODULE_SIZE);
    
    list.push({ kat_no: 0, secilen_sac_kalinligi_mm: selectedThicknesses[0] || 3.0, kat_modul_sayisi: enMod * boyMod });
    const wallModulesPerFloor = 2 * (enMod + boyMod);
    for (let i = 1; i <= floorCount; i++) {
      list.push({ 
        kat_no: i, 
        secilen_sac_kalinligi_mm: selectedThicknesses[i] || (2.0 - (i * 0.5) > 1.5 ? 2.0 - (i * 0.5) : 1.5), 
        kat_modul_sayisi: wallModulesPerFloor 
      });
    }
    list.push({ kat_no: floorCount + 1, secilen_sac_kalinligi_mm: selectedThicknesses[floorCount + 1] || 1.5, kat_modul_sayisi: enMod * boyMod });
    return list;
  }, [dimensions, selectedThicknesses]);

  const metrics = useMemo(() => {
    const hacim = (dimensions.en / 1000) * (dimensions.boy / 1000) * (dimensions.yukseklik / 1000);
    const tabanModul = (dimensions.en / MODULE_SIZE) * (dimensions.boy / MODULE_SIZE);
    const toplamModulTekDepo = floors.reduce((sum, f) => sum + f.kat_modul_sayisi, 0);
    const toplamAgirlikTekDepo = floors.reduce((sum, f) => sum + (f.kat_modul_sayisi * (SAC_AGIRLIK_TABLOSU[f.secilen_sac_kalinligi_mm] || 0)), 0);
    
    return { 
      hacim, 
      kapasite: hacim * depoAdedi, 
      tabanModul, 
      toplamModul: toplamModulTekDepo * depoAdedi, 
      toplamAgirlik: toplamAgirlikTekDepo * depoAdedi, 
      isValid: dimensions.en % MODULE_SIZE === 0 && dimensions.boy % MODULE_SIZE === 0 && dimensions.yukseklik % MODULE_SIZE === 0 
    };
  }, [dimensions, floors, depoAdedi]);

  const onCalculate = async () => {
    if (!metrics.isValid) return;
    setIsCalculating(true);
    try {
      const inputs: CalculationInputs = {
        depo_en: dimensions.en,
        depo_boy: dimensions.boy,
        depo_yukseklik: dimensions.yukseklik,
        depo_adedi: depoAdedi,
        depo_tipi: depoTipi,
        sac_kg_fiyatlari: depoTipi === 'galvaniz' ? galvanizPrices : paslanmazPrices,
        ...costs,
        kat_detaylari: floors,
        ...proposalParams,
        para_birimi: currency
      };
      const calculationResult = await calculateCosts(inputs);
      setResult(calculationResult);
    } catch (err) {
      console.error("Calculation failed:", err);
      alert("Hesaplama sırasında hata oluştu.");
    } finally {
      setIsCalculating(false);
    }
  };

  const formatPriceValue = (val: number | undefined) => {
    if (val === undefined) return '—';
    return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + CURRENCY_SYMBOLS[currency];
  };

  const currentPrices = depoTipi === 'galvaniz' ? galvanizPrices : paslanmazPrices;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${depoTipi === 'galvaniz' ? 'bg-slate-700' : 'bg-blue-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">TankEngine <span className="text-blue-600 italic">PRO</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('calc')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'calc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Analiz</button>
              <button onClick={() => setActiveTab('proposal')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'proposal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Teklif</button>
            </nav>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(['TL', 'USD', 'EUR'] as Currency[]).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{c}</button>
              ))}
            </div>
            <button onClick={onCalculate} disabled={isCalculating || !metrics.isValid} className={`px-6 py-2.5 rounded-full font-bold transition-all shadow-md ${isCalculating || !metrics.isValid ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {isCalculating ? '...' : 'Hesapla'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'calc' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              {/* Box 1: Core Configuration */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="space-y-6">
                  {/* Depo Tipi */}
                  <section>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Depo Tipi</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => {setDepoTipi('galvaniz'); setResult(null);}}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${depoTipi === 'galvaniz' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500'}`}
                      >
                        Galvaniz
                      </button>
                      <button 
                        onClick={() => {setDepoTipi('paslanmaz'); setResult(null);}}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${depoTipi === 'paslanmaz' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                      >
                        Paslanmaz
                      </button>
                    </div>
                  </section>

                  {/* Depo Adedi */}
                  <section>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Depo Adedi</h3>
                    <input type="number" min="1" value={depoAdedi} onChange={handleDepoAdediChange} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                  </section>

                  {/* Ölçü (Renamed from Ölçü & Montaj) */}
                  <section>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Ölçü</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">En (mm)</label>
                        <select name="en" value={dimensions.en} onChange={handleDimensionSelectChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                          {enBoyOptions.map(v => <option key={v} value={v}>{v} ({v/1000}m)</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Boy (mm)</label>
                        <select name="boy" value={dimensions.boy} onChange={handleDimensionSelectChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                          {enBoyOptions.map(v => <option key={v} value={v}>{v} ({v/1000}m)</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Yükseklik (mm)</label>
                        <select name="yukseklik" value={dimensions.yukseklik} onChange={handleDimensionSelectChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                          {yukseklikOptions.map(v => <option key={v} value={v}>{v} ({v/1000}m)</option>)}
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Box 2: Materials Pricing */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Hammadde Fiyatları ({CURRENCY_SYMBOLS[currency]}/kg)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {THICKNESS_OPTIONS.map(thick => (
                    <div key={thick} className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">{thick} mm</label>
                      <input 
                        type="number" 
                        value={currentPrices[thick.toString()]} 
                        onChange={(e) => handleSacPriceChange(thick.toString(), e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm font-medium" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 3: Additional Costs */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">İşçilik & Aksesuar</h3>
                <div className="space-y-4">
                  <InputGroup label="İşçilik / Modül" name="iscilik_birim_maliyeti" value={costs.iscilik_birim_maliyeti} onChange={handleCostChange} unit={CURRENCY_SYMBOLS[currency]} />
                  <InputGroup label="Merdiven (Birim)" name="merdiven_birim_maliyeti" value={costs.merdiven_birim_maliyeti} onChange={handleCostChange} unit={CURRENCY_SYMBOLS[currency]} />
                  <InputGroup label="Manşon (Depo Başı)" name="manson_toplam_maliyeti" value={costs.manson_toplam_maliyeti} onChange={handleCostChange} unit={CURRENCY_SYMBOLS[currency]} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapasite</span>
                  <div className="text-xl font-bold text-slate-900">{metrics.kapasite.toFixed(1)} Ton</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{depoTipi} Depo</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Modül</span>
                  <div className="text-xl font-bold text-slate-900">{metrics.toplamModul} Adet</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam Ağırlık</span>
                  <div className="text-xl font-bold text-orange-600">{metrics.toplamAgirlik.toFixed(1)} kg</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam</span>
                  <div className="text-xl font-bold text-blue-600">{result ? formatPriceValue(result.genel_toplam_maliyet) : '—'}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800">Katman Bazlı Kalınlık Seçimi</h3>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tekli Depo Analizi</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-3">Katman</th>
                        <th className="px-6 py-3">Kalınlık</th>
                        <th className="px-6 py-3">Modül</th>
                        <th className="px-6 py-3">Ağırlık</th>
                        <th className="px-6 py-3 text-right">Kat Maliyeti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {floors.map(kat => {
                        const rowRes = result?.kat_detaylari?.find(rk => rk.kat_no === kat.kat_no);
                        return (
                          <tr key={kat.kat_no} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold">{kat.kat_no === 0 ? 'Taban' : kat.kat_no === (Math.floor(dimensions.yukseklik / MODULE_SIZE) + 1) ? 'Tavan' : `${kat.kat_no}. Yan Kat`}</td>
                            <td className="px-6 py-4">
                              <select 
                                value={kat.secilen_sac_kalinligi_mm} 
                                onChange={(e) => handleThicknessChange(kat.kat_no, e.target.value)}
                                className="bg-white border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {THICKNESS_OPTIONS.map(o => <option key={o} value={o}>{o} mm</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-4">{kat.kat_modul_sayisi}</td>
                            <td className="px-6 py-4">{(kat.kat_modul_sayisi * SAC_AGIRLIK_TABLOSU[kat.secilen_sac_kalinligi_mm]).toFixed(1)} kg</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">{rowRes ? formatPriceValue(rowRes.kat_maliyeti) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Müşteri & Proje</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Müşteri Ünvanı</label>
                    <input type="text" name="musteri_adi" value={proposalParams.musteri_adi} onChange={handleProposalParamChange} className="border p-2 rounded-lg text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Proje Adı</label>
                    <input type="text" name="proje_adi" value={proposalParams.proje_adi} onChange={handleProposalParamChange} className="border p-2 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Finansal Parametreler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Kar (%)" name="kar_orani_yuzde" value={proposalParams.kar_orani_yuzde} onChange={handleProposalParamChange} step="0.1" />
                  <InputGroup label="İskonto (%)" name="iskonto_yuzde" value={proposalParams.iskonto_yuzde} onChange={handleProposalParamChange} step="0.1" />
                  <InputGroup label="KDV (%)" name="kdv_yuzde" value={proposalParams.kdv_yuzde} onChange={handleProposalParamChange} />
                  <InputGroup label="Geçerlilik (Gün)" name="teklif_gecerlilik_gun" value={proposalParams.teklif_gecerlilik_gun} onChange={handleProposalParamChange} />
                </div>
              </div>
            </div>

            {result?.teklif_ozeti ? (
              <div className="bg-white shadow-2xl rounded-3xl p-12 mx-auto border border-slate-200 proposal-paper print:shadow-none print:border-none">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-12">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">RESMİ TEKLİF</h2>
                    <p className="text-slate-500 font-bold">Ref: {result.teklif_ozeti.teklif_no} | {result.teklif_ozeti.teklif_tarihi}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-600 uppercase">TankEngine</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Endüstriyel Depolama Çözümleri</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-16 mb-16">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Sayın</h4>
                    <p className="text-xl font-bold text-slate-900 uppercase">{result.teklif_ozeti.musteri_adi || '—'}</p>
                    <p className="text-sm text-slate-500 font-medium italic">Proje: {result.teklif_ozeti.proje_adi || 'Genel'}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 text-right">Sistem Özeti</h4>
                    <p className="text-lg font-bold text-slate-900">{result.teklif_ozeti.depo_olculeri}</p>
                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest">{result.teklif_ozeti.depo_tipi_etiket}</p>
                    <p className="text-xl font-black text-blue-600 tracking-tight">{result.teklif_ozeti.su_kapasitesi_ton} Ton Toplam Kapasite</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-8 mb-16 space-y-4 border border-slate-100">
                   <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Konfigürasyon:</span>
                    <span className="text-slate-900 font-bold">{result.teklif_ozeti.kullanilan_modul_bilgisi}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Malzeme Kalınlıkları:</span>
                    <span className="text-slate-900 font-bold">{result.teklif_ozeti.sac_kalinlik_ozeti}</span>
                  </div>
                </div>

                <div className="border-t-8 border-slate-900 pt-8 space-y-4">
                  <div className="flex justify-between items-center text-slate-600 font-bold text-lg">
                    <span>Satış Bedeli</span>
                    <span>{formatPriceValue(result.teklif_ozeti.satis_bedeli)}</span>
                  </div>
                  {result.teklif_ozeti.iskonto_tutari > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 font-black italic">
                      <span>Özel İskonto (%{result.teklif_ozeti.iskonto_yuzde})</span>
                      <span>-{formatPriceValue(result.teklif_ozeti.iskonto_tutari)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-500 font-bold">
                    <span>KDV (%{result.teklif_ozeti.kdv_yuzde})</span>
                    <span>{formatPriceValue(result.teklif_ozeti.kdv_tutari)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-6 text-blue-700">
                    <span className="text-2xl font-black uppercase">GENEL TOPLAM</span>
                    <span className="text-5xl font-black tracking-tighter">{formatPriceValue(result.teklif_ozeti.genel_toplam_teklif)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 text-[10px] font-bold text-slate-400 mt-20 border-t pt-8">
                  <div className="space-y-1">
                    <p className="text-slate-900 uppercase tracking-widest mb-2 font-black">Teslimat & Geçerlilik</p>
                    <p>Teslimat Süresi: {result.teklif_ozeti.teslim_suresi_gun} İş Günü</p>
                    <p>Teklif Geçerlilik: {result.teklif_ozeti.teklif_gecerlilik_gun} Gün</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-40 h-24 border-2 border-slate-100 rounded-2xl mb-2 bg-slate-50/50"></div>
                    <p className="uppercase tracking-widest font-black text-slate-900">YETKİLİ İMZA / KAŞE</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center space-y-6">
                 <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">Veriler Hazırlanıyor</h3>
                 <p className="text-slate-500">Hesapla butonuna basarak ticari teklif dökümanını oluşturabilirsiniz.</p>
              </div>
            )}

            <div className="flex justify-center pt-8 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                PDF Olarak Kaydet
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          TankEngine Pro System © 2025 • Modüler Hesaplama Çözümleri
        </div>
      </footer>
    </div>
  );
};

export default App;
