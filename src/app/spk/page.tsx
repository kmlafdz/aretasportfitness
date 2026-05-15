"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Settings, AlertTriangle, Save, X, TrendingUp, RefreshCw, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useLanguageStore } from "@/store/useLanguageStore";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";
import { SuccessModal } from "@/components/ui/success-modal";

interface Equipment {
  id: string;
  name: string;
  category: string;
  condition: string;
}

interface Assessment {
  equipmentId: string;
  kerusakan: number;
  pemakaian: number;
  umur: number;
  biaya: number;
  risiko: number;
  deskripsi: string;
}

export default function MaintenancePage() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  
  const [weights, setWeights] = useState({
    kerusakan: 0.3,
    pemakaian: 0.25,
    umur: 0.15,
    biaya: 0.1,
    risiko: 0.2
  });

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "equipment"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Equipment[];
      setEquipmentList(data);
      setAssessments(prev => {
        const newAssessments = [...prev];
        data.forEach(eq => {
          if (!newAssessments.find(a => a.equipmentId === eq.id)) {
            newAssessments.push({ equipmentId: eq.id, kerusakan: 0, pemakaian: 0, umur: 0, biaya: 0, risiko: 0, deskripsi: "" });
          }
        });
        return newAssessments;
      });
    });
    return () => unsub();
  }, []);

  const handleAssessmentChange = (eqId: string, field: keyof Assessment, value: string) => {
    if (field === 'deskripsi') {
      setAssessments(prev => prev.map(a => a.equipmentId === eqId ? { ...a, deskripsi: value } : a));
      return;
    }
    let numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    if (numValue > 5) numValue = 5;
    setAssessments(prev => prev.map(a => a.equipmentId === eqId ? { ...a, [field]: numValue } : a));
  };

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setAssessments(prev => prev.map(a => ({ ...a, kerusakan: 0, pemakaian: 0, umur: 0, biaya: 0, risiko: 0, deskripsi: "" })));
    setIsResetModalOpen(false);
  };

  const maxKerusakan = Math.max(...assessments.map(a => a.kerusakan), 1);
  const maxPemakaian = Math.max(...assessments.map(a => a.pemakaian), 1);
  const maxUmur = Math.max(...assessments.map(a => a.umur), 1);
  const maxBiaya = Math.max(...assessments.map(a => a.biaya), 1);
  const maxRisiko = Math.max(...assessments.map(a => a.risiko), 1);

  const results = assessments.map(a => {
    const eq = equipmentList.find(e => e.id === a.equipmentId);
    const nKerusakan = a.kerusakan / maxKerusakan;
    const nPemakaian = a.pemakaian / maxPemakaian;
    const nUmur = a.umur / maxUmur;
    const nBiaya = a.biaya / maxBiaya;
    const nRisiko = a.risiko / maxRisiko;
    const score = (nKerusakan * weights.kerusakan) + (nPemakaian * weights.pemakaian) + (nUmur * weights.umur) + (nBiaya * weights.biaya) + (nRisiko * weights.risiko);
    return { id: a.equipmentId, name: eq?.name || "Unknown", type: eq?.category || "", status: eq?.condition || "", deskripsi: a.deskripsi, score };
  }).sort((a,b) => b.score - a.score);

  const highPriorityCount = results.filter(r => r.score >= 0.8).length;

  const [formLevel, setFormLevel] = useState(1);
  const [formDesc, setFormDesc] = useState("");
  const [formEqId, setFormEqId] = useState("");
  const [formCrit, setFormCrit] = useState("kerusakan");

  useEffect(() => {
    if (equipmentList.length > 0 && !formEqId) {
      setFormEqId(equipmentList[0].id);
    }
  }, [equipmentList, formEqId]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <Header />
        <main className="p-4 lg:p-10 flex-1 overflow-x-hidden space-y-10">
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter heading-font uppercase">{t.spk}</h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase leading-relaxed">{language === 'id' ? "SISTEM PENDUKUNG KEPUTUSAN" : "DECISION SUPPORT SYSTEM"}</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button onClick={handleReset} className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-500 hover:text-foreground font-black text-[10px] uppercase tracking-widest transition-all"><RefreshCw className="h-4 w-4 inline mr-2" /> RESET</button>
              <button onClick={() => setIsWeightsModalOpen(true)} className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-gradient-to-br from-[#FF5A2C] to-red-600 hover:brightness-110 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95"><Settings className="h-4 w-4 inline mr-2" /> {t.criteriaWeights}</button>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6 border-2 border-[#FF5A2C]/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#FF5A2C]/10 rounded-xl text-[#FF5A2C]"><Save className="h-4 w-4" /></div>
                  <h2 className="text-sm font-black text-foreground heading-font uppercase tracking-wider">{language === 'id' ? 'INPUT PENILAIAN' : 'ADD ASSESSMENT'}</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{language === 'id' ? 'PILIH ASET' : 'SELECT ASSET'}</label>
                    <select value={formEqId} onChange={(e) => setFormEqId(e.target.value)} className="w-full h-11 bg-black/20 border border-white/5 rounded-xl px-4 text-xs font-bold text-foreground appearance-none">
                      {equipmentList.map(eq => <option key={eq.id} value={eq.id} className="bg-background">{eq.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{language === 'id' ? 'KRITERIA' : 'CRITERIA'}</label>
                    <select value={formCrit} onChange={(e) => setFormCrit(e.target.value)} className="w-full h-11 bg-black/20 border border-white/5 rounded-xl px-4 text-xs font-bold text-foreground appearance-none">
                      <option value="kerusakan" className="bg-background">{language === 'id' ? 'TINGKAT KERUSAKAN' : 'DAMAGE LEVEL'}</option>
                      <option value="pemakaian" className="bg-background">{language === 'id' ? 'INTENSITAS PAKAI' : 'USAGE INTENSITY'}</option>
                      <option value="umur" className="bg-background">{language === 'id' ? 'UMUR EKONOMIS' : 'AGE'}</option>
                      <option value="biaya" className="bg-background">{language === 'id' ? 'ESTIMASI BIAYA' : 'COST'}</option>
                      <option value="risiko" className="bg-background">RISIKO KEGAGALAN</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">PSI LEVEL (1-5)</label>
                    <div className="flex justify-between gap-2">
                      {[1,2,3,4,5].map(v => (
                        <button key={v} onClick={() => setFormLevel(v)} className={`flex-1 h-10 rounded-xl text-[10px] font-black transition-all border ${formLevel === v ? 'bg-[#FF5A2C] text-white border-[#FF5A2C] shadow-lg shadow-orange-500/20' : 'bg-black/20 border-white/5 text-gray-500'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{language === 'id' ? 'DESKRIPSI' : 'DESCRIPTION'}</label>
                    <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="..." className="w-full h-11 bg-black/20 border border-white/5 rounded-xl px-4 text-xs font-bold text-foreground focus:outline-none focus:border-[#FF5A2C]/50" />
                  </div>
                  <button onClick={() => {
                    handleAssessmentChange(formEqId, formCrit as any, String(formLevel));
                    if (formDesc) handleAssessmentChange(formEqId, 'deskripsi', formDesc);
                    setFormDesc("");
                    setSuccessModal({
                      isOpen: true,
                      title: language === 'id' ? "Matriks Diperbarui" : "Matrix Updated",
                      message: language === 'id' ? "Data penilaian aset telah berhasil diperbarui." : "Asset assessment data has been successfully updated."
                    });
                  }} className="w-full h-12 bg-[#FF5A2C] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all mt-4">{language === 'id' ? 'UPDATE MATRIKS' : 'UPDATE MATRIX'}</button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label={t.highPriority} value={highPriorityCount} icon={AlertTriangle} color="orange" sub={language === 'id' ? "Aset Kritis" : "Critical Assets"} />
                <StatCard label={t.assessed} value={results.length} icon={Wrench} color="blue" sub={language === 'id' ? "Aset Dinilai" : "Evaluated Assets"} />
                <StatCard label={t.inventory} value={equipmentList.length} icon={TrendingUp} color="teal" sub={language === 'id' ? "Total Item" : "Total Items"} />
              </div>

              <div className="glass-card flex flex-col shadow-2xl">
                <div className="p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{t.assessmentMatrix}</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Daftar Penilaian Aset" : "Asset Assessment List"}</p>
                  </div>
                  <div className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/20 uppercase tracking-widest">Live Updates</div>
                </div>
                
                <div className="p-4 lg:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessments.filter(a => a.kerusakan > 0 || a.pemakaian > 0 || a.umur > 0 || a.biaya > 0 || a.risiko > 0).map(assess => {
                      const eq = equipmentList.find(e => e.id === assess.equipmentId);
                      if (!eq) return null;
                      return (
                        <motion.div layout key={assess.equipmentId} className="glass-dark border border-white/5 rounded-2xl p-5 group hover:border-[#FF5A2C]/30 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-sm font-black text-foreground uppercase tracking-wide heading-font">{eq.name}</h3>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{eq.category}</p>
                            </div>
                            <button onClick={() => handleAssessmentChange(eq.id, 'kerusakan', '0')} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                              { label: 'KERUSAKAN', val: assess.kerusakan },
                              { label: 'PAKAI', val: assess.pemakaian },
                              { label: 'UMUR', val: assess.umur },
                              { label: 'BIAYA', val: assess.biaya },
                              { label: 'RISIKO', val: assess.risiko },
                            ].map(c => (
                              <div key={c.label} className="bg-black/20 rounded-xl p-2.5 text-center border border-white/5">
                                <p className="text-[8px] font-black text-gray-600 mb-1 tracking-tighter">{c.label}</p>
                                <p className={`text-xs font-black ${c.val >= 4 ? 'text-red-500' : c.val >= 3 ? 'text-orange-500' : 'text-foreground'}`}>Lvl {c.val}</p>
                              </div>
                            ))}
                          </div>
                          
                          {assess.deskripsi && (
                            <div className="bg-black/10 rounded-xl px-4 py-3 border-l-2 border-[#FF5A2C]">
                              <p className="text-[10px] font-bold text-gray-400 italic line-clamp-2">"{assess.deskripsi}"</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    {assessments.filter(a => a.kerusakan > 0 || a.pemakaian > 0 || a.umur > 0 || a.biaya > 0 || a.risiko > 0).length === 0 && (
                      <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center gap-4 opacity-30">
                        <Wrench className="h-10 w-10 text-gray-500" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">{language === 'id' ? "BELUM ADA DATA" : "NO DATA YET"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
             <div className="glass-card p-8 flex flex-col gap-8">
                <div>
                  <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{t.priorityRanking}</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Kalkulasi metode SAW" : "SAW Method calculation"}</p>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.slice(0, 8)} layout="vertical" margin={{ left: 40 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" stroke="#555" fontSize={10} fontWeight="900" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: '900' }} />
                      <Bar dataKey="score" fill="#FF5A2C" radius={[0, 8, 8, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="glass-card p-8 flex flex-col gap-8">
                <div>
                   <h2 className="text-xl font-black text-foreground heading-font uppercase tracking-tight">{language === 'id' ? "Aset Berisiko Tinggi" : "High Risk Assets"}</h2>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{language === 'id' ? "Tindakan segera diperlukan" : "Immediate action required"}</p>
                </div>
                <div className="space-y-4">
                   {results.slice(0, 5).map((res, i) => (
                     <div key={res.id} className="flex items-center justify-between p-4 rounded-2xl glass border border-white/5 group">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${i < 2 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-gray-500'}`}>{i + 1}</div>
                          <div>
                            <h3 className="text-xs font-black text-foreground uppercase tracking-wide">{res.name}</h3>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{res.type} • Score: {res.score.toFixed(3)}</p>
                          </div>
                       </div>
                       <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${res.score >= 0.8 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                          {res.score >= 0.8 ? (language === 'id' ? 'KRITIS' : 'CRITICAL') : (language === 'id' ? 'PENTING' : 'URGENT')}
                       </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isWeightsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md glass-card p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-foreground heading-font uppercase tracking-tight">{t.criteriaWeights}</h2>
                <button onClick={() => setIsWeightsModalOpen(false)} className="p-2 text-gray-500 hover:text-foreground"><X className="h-6 w-6" /></button>
              </div>
              <div className="space-y-6">
                {Object.entries(weights).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{key}</label>
                    <input type="number" step="0.05" min="0" max="1" className="w-20 bg-transparent text-right font-black text-foreground focus:outline-none" value={value} onChange={(e) => setWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Weight:</span>
                  <span className={`text-sm font-black ${Math.abs(totalWeight - 1) < 0.01 ? 'text-teal-500' : 'text-red-500'}`}>{totalWeight.toFixed(2)} / 1.00</span>
                </div>
                <Button onClick={() => {
                  setIsWeightsModalOpen(false);
                  setSuccessModal({
                    isOpen: true,
                    title: language === 'id' ? "Bobot Disimpan" : "Weights Saved",
                    message: language === 'id' ? "Konfigurasi kriteria SPK telah diperbarui." : "SPK criteria configuration has been updated."
                  });
                }} className="w-full h-14 bg-[#FF5A2C] text-white font-black uppercase rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95">{language === 'id' ? "SIMPAN KONFIGURASI" : "SAVE CONFIGURATION"}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DeleteConfirmModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmReset}
        title={language === 'id' ? "Konfirmasi Reset" : "Confirm Reset"}
        message={language === 'id' ? "Hapus semua data penilaian aset ini?" : "Clear all asset assessment data?"}
        confirmText={language === 'id' ? "Ya, Reset" : "Yes, Reset"}
      />

      <SuccessModal 
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    orange: "bg-[#FF5A2C]/10 text-[#FF5A2C] border-[#FF5A2C]/20"
  };

  return (
    <motion.div whileHover={{ y: -5 }} className="glass-card p-8 relative group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xs font-black text-gray-500 tracking-[0.3em] uppercase mb-1.5">{label}</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest ${colors[color]}`}>
            {sub}
          </div>
        </div>
        <div className={`p-3 rounded-2xl border ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-4xl font-black text-foreground heading-font tracking-tighter">{value}</p>
        <ArrowUpRight className="h-5 w-5 text-gray-700 group-hover:text-foreground transition-colors" />
      </div>
    </motion.div>
  );
}
