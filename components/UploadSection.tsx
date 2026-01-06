import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, CreditCard, X, ArrowRight, Calendar, DollarSign, Tag } from 'lucide-react';
import { analyzeFinancialDocument, fileToGenerativePart } from '../services/geminiService';
import { Transaction, Category, Account } from '../types';

interface UploadSectionProps {
  categories: Category[];
  accounts: Account[];
  onTransactionsParsed: (transactions: Partial<Transaction>[]) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ categories, accounts, onTransactionsParsed }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  // Preview State
  const [previewTransactions, setPreviewTransactions] = useState<Partial<Transaction>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Basic validation
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error("Only images (JPG, PNG) and PDF files are supported.");
      }

      const { data, mimeType } = await fileToGenerativePart(file);
      const parsedTransactions = await analyzeFinancialDocument(data, mimeType, categories);
      
      // Associate with account if selected
      const finalTransactions = parsedTransactions.map(t => {
        const account = accounts.find(a => a.id === selectedAccountId);
        return {
          ...t,
          accountId: selectedAccountId || undefined,
          source: account ? account.name : 'File Upload'
        };
      });

      setPreviewTransactions(finalTransactions);
      setShowPreview(true);
    } catch (err: any) {
      setError(err.message || "Failed to process file.");
    } finally {
      setIsLoading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const parsedTransactions = await analyzeFinancialDocument(textInput, 'text/plain', categories);
      
      const finalTransactions = parsedTransactions.map(t => {
         const account = accounts.find(a => a.id === selectedAccountId);
         return {
           ...t,
           accountId: selectedAccountId || undefined,
           source: account ? account.name : 'Text Paste'
         };
      });
      
      setPreviewTransactions(finalTransactions);
      setShowPreview(true);
      setTextInput('');
    } catch (err: any) {
      setError(err.message || "Failed to process text.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
      onTransactionsParsed(previewTransactions);
      setPreviewTransactions([]);
      setShowPreview(false);
      setSuccess(true);
  };

  const handleCancelImport = () => {
      setPreviewTransactions([]);
      setShowPreview(false);
  };

  const previewStats = useMemo(() => {
      const total = previewTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
      const expenseCount = previewTransactions.filter(t => t.isExpense).length;
      const incomeCount = previewTransactions.filter(t => !t.isExpense).length;
      return { total, expenseCount, incomeCount };
  }, [previewTransactions]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Import Transactions</h2>
        <p className="text-slate-500 font-medium">Upload a statement (PDF/Image) or paste text to analyze transactions.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'file' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('file')}
          >
            <ImageIcon size={18} />
            File Upload
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'text' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('text')}
          >
            <FileText size={18} />
            Paste Text
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Account Selection */}
          <div className="space-y-2">
             <label className="text-sm font-bold text-slate-700">Link to Account (Optional)</label>
             <div className="relative">
                <select 
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700 font-medium shadow-sm cursor-pointer"
                >
                  <option value="">-- Detect or Generic --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type.replace('_', ' ')})</option>
                  ))}
                </select>
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
             </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-slate-700 font-bold text-lg">Processing with Gemini AI...</p>
              <p className="text-slate-400 text-sm font-medium">Extracting transactions from your document.</p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Import Successful!</h3>
                <p className="text-slate-500 text-center max-w-sm font-medium">
                    Transactions have been processed. We've checked for duplicates and added them to your dashboard.
                </p>
              </div>
              <button 
                onClick={() => setSuccess(false)}
                className="mt-4 px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Upload More
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'file' && (
                <div 
                  className="border-3 border-dashed border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group bg-slate-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-5 bg-white rounded-full text-indigo-500 mb-6 shadow-md group-hover:scale-110 transition-transform group-hover:text-indigo-600">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Click to upload statement</h3>
                  <p className="text-slate-400 text-sm text-center font-medium">Supports PDF documents and Images (JPG, PNG).</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Paste Transaction Text</label>
                  <textarea 
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-700 placeholder-slate-400 shadow-inner"
                    placeholder={`Date       Description       Amount\n...`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleTextSubmit}
                      disabled={!textInput.trim()}
                      className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
                    >
                      Process Text
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                   Review Import
                   <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold border border-indigo-100">
                     {previewTransactions.length} Items
                   </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Review the AI-extracted transactions before importing.</p>
              </div>
              <button 
                onClick={handleCancelImport}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-1 bg-slate-50 border-b border-slate-100">
               <div className="p-4 text-center border-r border-slate-200 last:border-0">
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Total Value</div>
                  <div className="text-lg font-bold text-slate-800">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(previewStats.total)}
                  </div>
               </div>
               <div className="p-4 text-center border-r border-slate-200 last:border-0">
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Expenses</div>
                  <div className="text-lg font-bold text-rose-500">{previewStats.expenseCount}</div>
               </div>
               <div className="p-4 text-center">
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Income</div>
                  <div className="text-lg font-bold text-emerald-500">{previewStats.incomeCount}</div>
               </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-0">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                   <tr>
                     <th className="px-6 py-4 w-28">Date</th>
                     <th className="px-6 py-4">Description</th>
                     <th className="px-6 py-4 w-32">Tags</th>
                     <th className="px-6 py-4 w-24 text-center">Confidence</th>
                     <th className="px-6 py-4 text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                   {previewTransactions.map((t, idx) => (
                     <tr key={idx} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap font-medium">{t.date}</td>
                       <td className="px-6 py-4">
                         <div className="font-bold text-slate-800">{t.enhancedDescription}</div>
                         <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">{t.category}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{t.source}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex flex-wrap gap-1">
                           {t.tags?.slice(0, 2).map((tag, i) => (
                             <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">{tag}</span>
                           ))}
                         </div>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <div className="flex justify-center" title={`${t.confidence}%`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              (t.confidence || 0) > 80 ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 
                              (t.confidence || 0) > 50 ? 'bg-amber-500 shadow-sm shadow-amber-200' : 'bg-rose-500 shadow-sm shadow-rose-200'
                            }`}></div>
                          </div>
                       </td>
                       <td className={`px-6 py-4 text-sm text-right font-bold ${t.isExpense ? 'text-slate-800' : 'text-emerald-600'}`}>
                         {t.isExpense ? '-' : '+'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.amount || 0)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
               <button 
                 onClick={handleCancelImport}
                 className="px-5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 font-bold transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleConfirmImport}
                 className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 transform hover:-translate-y-0.5"
               >
                 <CheckCircle size={18} />
                 Confirm Import
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
