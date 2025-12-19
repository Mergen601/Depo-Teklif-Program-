
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { CalculationInputs, CalculationResult } from "./types";

export const calculateCosts = async (inputs: CalculationInputs): Promise<CalculationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: JSON.stringify(inputs),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result as CalculationResult;
  } catch (error) {
    console.error("Calculation Error:", error);
    return {
      olcu_dogrulama: false,
      depo_hacmi_m3: 0,
      su_kapasitesi_ton: 0,
      toplam_modul_sayisi: 0,
      taban_modul_sayisi: 0,
      kat_detaylari: [],
      toplam_hammadde_maliyeti: 0,
      toplam_iscilik_maliyeti: 0,
      toplam_montaj_maliyeti: 0,
      toplam_plastik_kaide_maliyeti: 0,
      merdiven_maliyeti: 0,
      manson_maliyeti: 0,
      genel_toplam_maliyet: 0,
      error: "Hesaplama sırasında bir hata oluştu. Lütfen girdileri kontrol edin."
    };
  }
};
