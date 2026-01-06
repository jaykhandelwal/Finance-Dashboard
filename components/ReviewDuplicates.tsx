import React, { useState } from 'react';
import { DuplicatePair, Transaction, Category } from '../types';
import { ArrowRight, Check, X, AlertCircle, AlertTriangle, Edit2, Copy, Eye } from 'lucide-react';

interface ReviewCenterProps {
  duplicates: DuplicatePair[];
  uncertainTransactions: Transaction[];
  categories: Category[];
  onResolveDuplicate: (id: string, action: 'keep_both' | 'discard_incoming') => void;
  onReviewAction: (txId: string, action: 'approve' | 'delete', updatedTx?: Transaction) => void;
  currency: string;
}

// Simple form data interface for the review modal
interface ReviewEditForm {
  amount: string;
  enhancedDescription: string;
  category: string;
}

export const ReviewCenter: React.FC<ReviewCenterProps> = ({ 
  duplicates, 
  uncertainTransactions,
  categories,
  onResolveDuplicate,
  onReviewAction,
  currency
}) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'uncertain'>('duplicates');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<ReviewEditForm | null>(null);

  // Auto-switch tabs if one is empty
  React.useEffect(() => {
    if (duplicates.length === 0 && uncertainTransactions.length > 0) {
        setActiveTab('uncertain');
    } else if (uncertainTransactions.length === 0 && duplicates.length > 0) {
        setActiveTab('duplicates');
    }
  }, [duplicates.length, uncertainTransactions.length]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({
      amount: tx.amount.toString(),
      enhancedDescription: tx.enhancedDescription,
      category: tx.category
    });
  };

  const handleEditSave = () => {
    if (editingTx && editForm) {
        const updatedTx: Transaction = {
          ...editingTx,
          amount: parseFloat(editForm.amount) || 0,
          enhancedDescription: editForm.enhancedDescription,
          category: editForm.category
        };
        onReviewAction(editingTx.id, 'approve', updatedTx);
        setEditingTx(null);
        setEditForm(null);
    }
  };

  if (duplicates.length === 0 && uncertainTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
          <Check className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">All Clear!</h2>
        <p className="text-slate-500 mt-2 max-w-md font-medium">
          There are no duplicates or low-confidence transactions requiring your attention right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Review Center</h2>
           <p className="text-slate-500 font-medium">Manage potential duplicates and verify low-confidence predictions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'duplicates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Copy size={18} />
          Duplicates
          {duplicates.length > 0 && (
             <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-extrabold">{duplicates.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('uncertain')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'uncertain' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <AlertTriangle size={18} />
          Low Confidence
          {uncertainTransactions.length > 0 && (
             <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs font-extrabold">{uncertainTransactions.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'duplicates' && (
        <div className="space-y-6 animate-fade-in">
           {duplicates.length === 0 ? (
               <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200 font-medium">
                   No duplicate conflicts found.
               </div>
           ) : (
             <div className="grid gap-8">
                {duplicates.map((pair) => (
                  <div key={pair.id} className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      
                      {/* Existing Transaction */}
                      <div className="p-8 bg-white">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">Existing In Database</span>
                          <span className="text-xs font-mono text-slate-400">ID: {pair.existing.id.slice(-4)}</span>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex justify-between items-baseline">
                             <span className="text-3xl font-extrabold text-slate-800">
                                {formatCurrency(pair.existing.amount)}
                             </span>
                             <span className="text-sm font-bold text-slate-500">{pair.existing.date}</span>
                           </div>
                           <div>
                             <p className="font-bold text-lg text-slate-800">{pair.existing.enhancedDescription}</p>
                             <p className="text-sm text-slate-500 mt-1 font-medium">{pair.existing.originalDescription}</p>
                           </div>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-bold">
                               {pair.existing.source}
                             </span>
                           </div>
                        </div>
                      </div>

                      {/* Incoming Transaction */}
                      <div className="p-8 bg-indigo-50/30 relative">
                         {/* Visual connector for desktop */}
                         <div className="hidden md:block absolute top-1/2 -left-4 w-8 h-8 bg-white border border-slate-200 rounded-full z-10 flex items-center justify-center transform -translate-y-1/2 shadow-sm text-slate-400">
                            <ArrowRight size={14} />
                         </div>

                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-2 py-1 rounded-md">Incoming Upload</span>
                        </div>

                        <div className="space-y-4">
                           <div className="flex justify-between items-baseline">
                             <span className="text-3xl font-extrabold text-slate-800">
                                {formatCurrency(pair.incoming.amount)}
                             </span>
                             <span className="text-sm font-bold text-slate-500">{pair.incoming.date}</span>
                           </div>
                           <div>
                             <p className="font-bold text-lg text-slate-800">{pair.incoming.enhancedDescription}</p>
                             <p className="text-sm text-slate-500 mt-1 font-medium">{pair.incoming.originalDescription}</p>
                           </div>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600 font-bold shadow-sm">
                               {pair.incoming.source}
                             </span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-100">
                      <span className="text-sm text-slate-500 font-medium mr-auto">Is this the same transaction?</span>
                      
                      <button 
                        onClick={() => onResolveDuplicate(pair.id, 'keep_both')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900 transition-all text-sm w-full sm:w-auto justify-center"
                      >
                        <X size={18} />
                        No, Keep Both
                      </button>
                      
                      <button 
                        onClick={() => onResolveDuplicate(pair.id, 'discard_incoming')}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white shadow-lg shadow-indigo-200 rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm w-full sm:w-auto justify-center transform hover:-translate-y-0.5"
                      >
                        <Check size={18} />
                        Yes, It's Duplicate
                      </button>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {activeTab === 'uncertain' && (
        <div className="space-y-6 animate-fade-in">
           {uncertainTransactions.length === 0 ? (
               <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200 font-medium">
                   No low confidence transactions found.
               </div>
           ) : (
               <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-amber-800 font-bold">Low Confidence Predictions</h3>
                      <p className="text-amber-700/80 text-sm mt-1 font-medium leading-relaxed">
                        The AI was less than 80% sure about the details of these transactions. Please verify descriptions, amounts, and categories.
                      </p>
                    </div>
                  </div>

                  {uncertainTransactions.map((tx) => (
                      <div key={tx.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start md:items-center">
                          <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-slate-400">{tx.date}</span>
                                 <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${tx.confidence > 50 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                     {tx.confidence}% Confidence
                                 </span>
                              </div>
                              <h4 className="font-bold text-slate-800 text-lg">{tx.enhancedDescription}</h4>
                              <p className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded inline-block">{tx.originalDescription}</p>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-bold border border-slate-200">{tx.category}</span>
                                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600 font-medium border border-slate-200">{tx.source}</span>
                              </div>
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                              <span className={`text-xl font-extrabold ${tx.isExpense ? 'text-slate-800' : 'text-emerald-600'}`}>
                                  {tx.isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
                              </span>
                              
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleStartEdit(tx)}
                                    className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                                    title="Edit details"
                                  >
                                      <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => onReviewAction(tx.id, 'approve')}
                                    className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm"
                                    title="Approve as Correct"
                                  >
                                      <Check size={18} />
                                  </button>
                                  <button 
                                    onClick={() => onReviewAction(tx.id, 'delete')}
                                    className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors shadow-sm"
                                    title="Delete Transaction"
                                  >
                                      <X size={18} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
               </div>
           )}
        </div>
      )}

      {/* Quick Edit Modal for Review */}
      {editingTx && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Verify Transaction</h3>
              <button 
                onClick={() => { setEditingTx(null); setEditForm(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Similar fields to main edit but tailored for review */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Merchant / Description</label>
                <input 
                  type="text" 
                  value={editForm.enhancedDescription}
                  onChange={(e) => setEditForm({...editForm, enhancedDescription: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm font-bold"
                        />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Category</label>
                    <div className="relative">
                        <select 
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm appearance-none cursor-pointer font-medium"
                        >
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-50">
                <button 
                  onClick={() => { setEditingTx(null); setEditForm(null); }}
                  className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSave}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                  <Check size={18} />
                  Verify & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};