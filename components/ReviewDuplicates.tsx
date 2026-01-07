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

  if (duplicates.length === 0 && uncertainTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">All Clear!</h2>
        <p className="text-slate-400 mt-2 max-w-md">
          There are no duplicates or low-confidence transactions requiring your attention right now.
        </p>
      </div>
    );
  }

  const handleEditSave = () => {
    if (editingTx) {
        onReviewAction(editingTx.id, 'approve', editingTx);
        setEditingTx(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-white">Review Center</h2>
           <p className="text-slate-400">Manage potential duplicates and verify low-confidence predictions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'duplicates' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <Copy size={16} />
          Duplicates
          {duplicates.length > 0 && (
             <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-xs">{duplicates.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('uncertain')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'uncertain' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <AlertTriangle size={16} />
          Low Confidence
          {uncertainTransactions.length > 0 && (
             <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs">{uncertainTransactions.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'duplicates' && (
        <div className="space-y-6 animate-fade-in">
           {duplicates.length === 0 ? (
               <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                   No duplicate conflicts found.
               </div>
           ) : (
             <div className="grid gap-6">
                {duplicates.map((pair) => (
                  <div key={pair.id} className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                      
                      {/* Existing Transaction */}
                      <div className="p-6 bg-slate-950/30">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existing In Database</span>
                          <span className="text-xs font-mono text-slate-600">ID: {pair.existing.id.slice(-4)}</span>
                        </div>
                        
                        <div className="space-y-3">
                           <div className="flex justify-between items-baseline">
                             <span className="text-2xl font-bold text-slate-200">
                                {formatCurrency(pair.existing.amount)}
                             </span>
                             <span className="text-sm text-slate-500">{pair.existing.date}</span>
                           </div>
                           <div>
                             <p className="font-medium text-slate-300">{pair.existing.enhancedDescription}</p>
                             <p className="text-xs text-slate-500 mt-1">{pair.existing.originalDescription}</p>
                           </div>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-400">
                               {pair.existing.source}
                             </span>
                           </div>
                        </div>
                      </div>

                      {/* Incoming Transaction */}
                      <div className="p-6 bg-slate-900 relative">
                         {/* Visual connector for desktop */}
                         <div className="hidden md:block absolute top-1/2 -left-3 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full z-10 flex items-center justify-center transform -translate-y-1/2 shadow-sm text-slate-500">
                            <ArrowRight size={12} />
                         </div>

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Incoming Upload</span>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between items-baseline">
                             <span className="text-2xl font-bold text-slate-200">
                                {formatCurrency(pair.incoming.amount)}
                             </span>
                             <span className="text-sm text-slate-500">{pair.incoming.date}</span>
                           </div>
                           <div>
                             <p className="font-medium text-slate-300">{pair.incoming.enhancedDescription}</p>
                             <p className="text-xs text-slate-500 mt-1">{pair.incoming.originalDescription}</p>
                           </div>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-400">
                               {pair.incoming.source}
                             </span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-slate-950/50 p-4 flex items-center justify-end gap-3 border-t border-slate-800">
                      <span className="text-sm text-slate-500 mr-auto">Is this the same transaction?</span>
                      
                      <button 
                        onClick={() => onResolveDuplicate(pair.id, 'keep_both')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 shadow-sm rounded-lg text-slate-300 font-medium hover:bg-slate-700 hover:text-white transition-all text-sm"
                      >
                        <X size={16} />
                        No, Keep Both
                      </button>
                      
                      <button 
                        onClick={() => onResolveDuplicate(pair.id, 'discard_incoming')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-md shadow-indigo-900/20 rounded-lg font-medium hover:bg-indigo-700 transition-all text-sm"
                      >
                        <Check size={16} />
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
               <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                   No low confidence transactions found.
               </div>
           ) : (
               <div className="space-y-4">
                  <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <h3 className="text-amber-400 font-semibold">Low Confidence Predictions</h3>
                      <p className="text-amber-500/80 text-sm">
                        The AI was less than 80% sure about the details of these transactions. Please verify descriptions, amounts, and categories.
                      </p>
                    </div>
                  </div>

                  {uncertainTransactions.map((tx) => (
                      <div key={tx.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                          <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className="text-sm text-slate-500">{tx.date}</span>
                                 <span className={`px-2 py-0.5 text-xs rounded-full border ${tx.confidence > 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                     {tx.confidence}% Confidence
                                 </span>
                              </div>
                              <h4 className="font-semibold text-white">{tx.enhancedDescription}</h4>
                              <p className="text-xs text-slate-500 font-mono">{tx.originalDescription}</p>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{tx.category}</span>
                                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{tx.source}</span>
                              </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              <span className={`text-lg font-bold ${tx.isExpense ? 'text-slate-200' : 'text-emerald-400'}`}>
                                  {tx.isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
                              </span>
                              
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => setEditingTx(tx)}
                                    className="p-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-indigo-400 transition-colors"
                                    title="Edit details"
                                  >
                                      <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => onReviewAction(tx.id, 'approve')}
                                    className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                    title="Approve as Correct"
                                  >
                                      <Check size={18} />
                                  </button>
                                  <button 
                                    onClick={() => onReviewAction(tx.id, 'delete')}
                                    className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
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
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Verify Transaction</h3>
              <button 
                onClick={() => setEditingTx(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Similar fields to main edit but tailored for review */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-400">Merchant / Description</label>
                <input 
                  type="text" 
                  value={editingTx.enhancedDescription}
                  onChange={(e) => setEditingTx({...editingTx, enhancedDescription: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-400">Amount</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingTx.amount}
                      onChange={(e) => setEditingTx({...editingTx, amount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-400">Category</label>
                    <select 
                      value={editingTx.category}
                      onChange={(e) => setEditingTx({...editingTx, category: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/50 flex items-center gap-2"
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