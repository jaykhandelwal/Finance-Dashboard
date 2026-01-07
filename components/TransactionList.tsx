import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, SplitItem } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, Edit2, X, Check, Hash, AlertTriangle, Trash2, CheckSquare, Square, Eye, EyeOff, HandCoins, User, Plus, Users, Calculator, PieChart } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateTransaction?: (transaction: Transaction | Transaction[]) => void;
  onBulkReview?: (ids: string[], isReviewed: boolean) => void;
  onBulkDelete?: (ids: string[]) => void;
  currency: string;
}

interface SplitParticipant {
  id: string;
  name: string;
  amount: number; // For exact mode
  isSelected: boolean; // For equal mode
  shares: number; // For shares mode
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  onUpdateTransaction,
  onBulkReview,
  onBulkDelete,
  currency
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Reviewed' | 'Unreviewed'>('All');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [lendingTx, setLendingTx] = useState<Transaction | null>(null);
  
  // Lending Form State
  const [splitMode, setSplitMode] = useState<'equal' | 'exact' | 'shares'>('equal');
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);
  const [newPersonName, setNewPersonName] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.enhancedDescription.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.originalDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'Reviewed') matchesStatus = t.isReviewed;
      if (statusFilter === 'Unreviewed') matchesStatus = !t.isReviewed;

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayed = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getCategoryColor = (catName: string) => {
    return categories.find(c => c.name === catName)?.color || '#94a3b8';
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx && onUpdateTransaction) {
      // If manually edited, we assume it's now verified and reviewed
      onUpdateTransaction({ ...editingTx, status: 'verified', confidence: 100, isReviewed: true });
      setEditingTx(null);
    }
  };

  const openLendModal = (t: Transaction) => {
      setLendingTx(t);
      setSplitMode(t.splitDetails?.splitType || 'equal');
      
      // Initialize participants
      // Always add "You" as the first participant
      const existingItems = t.splitDetails?.items || [];
      const initParticipants: SplitParticipant[] = [
        { id: 'user', name: 'You', amount: 0, isSelected: true, shares: 1 }
      ];

      if (existingItems.length > 0) {
        // Populate from existing
        existingItems.forEach(item => {
           initParticipants.push({
             id: item.id,
             name: item.name,
             amount: item.amount,
             isSelected: true,
             shares: 1 // Default to 1 if not stored previously, simpler for now
           });
        });
        
        // Adjust "You" amount for Exact Mode visual consistency
        const totalLent = existingItems.reduce((acc, i) => acc + i.amount, 0);
        initParticipants[0].amount = t.amount - totalLent;

      } else {
        // Default clean state
        initParticipants[0].amount = t.amount;
      }
      
      setParticipants(initParticipants);
  };

  const addParticipant = () => {
    if (!newPersonName.trim()) return;
    setParticipants([...participants, {
      id: Date.now().toString(),
      name: newPersonName.trim(),
      amount: 0,
      isSelected: true,
      shares: 1
    }]);
    setNewPersonName('');
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const toggleParticipantSelection = (id: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, isSelected: !p.isSelected } : p));
  };

  const updateParticipantAmount = (id: string, amount: number) => {
     setParticipants(participants.map(p => p.id === id ? { ...p, amount } : p));
  };

  const updateParticipantShares = (id: string, shares: number) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, shares: Math.max(0, shares) } : p));
 };

  // Derived state for the modal
  const selectedCount = participants.filter(p => p.isSelected).length;
  const splitAmount = lendingTx && selectedCount > 0 ? lendingTx.amount / selectedCount : 0;
  
  const totalAllocatedExact = participants.filter(p => p.id !== 'user').reduce((acc, p) => acc + (p.amount || 0), 0);
  const remainingExact = lendingTx ? lendingTx.amount - totalAllocatedExact : 0;

  const totalShares = participants.reduce((acc, p) => acc + (p.shares || 0), 0);
  const shareUnitValue = lendingTx && totalShares > 0 ? lendingTx.amount / totalShares : 0;

  const handleLendSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!lendingTx || !onUpdateTransaction) return;

      const items: SplitItem[] = [];
      let totalLent = 0;
      
      // We will batch update other transactions if we sweep credits
      const updatesMap = new Map<string, Transaction>();

      // Logic to sweep credit from other transactions
      const sweepCreditForPerson = (personName: string): number => {
          let creditFound = 0;
          // Look at ALL transactions to find surplus
          transactions.forEach(tx => {
              if (tx.id === lendingTx.id) return; // Skip current
              if (!tx.splitDetails) return;
              
              const itemIndex = tx.splitDetails.items.findIndex(i => i.name === personName);
              if (itemIndex === -1) return;
              
              const item = tx.splitDetails.items[itemIndex];
              const paid = item.paidAmount || 0;
              const surplus = paid - item.amount;
              
              if (surplus > 0.01) {
                  // Found credit! Move it.
                  creditFound += surplus;
                  
                  // Clone tx for update
                  let txToUpdate = updatesMap.get(tx.id);
                  if (!txToUpdate) {
                     txToUpdate = { ...tx, splitDetails: { ...tx.splitDetails!, items: [...tx.splitDetails!.items] } };
                  }
                  
                  // Reduce paid amount on old tx to match amount (removing surplus)
                  const items = txToUpdate.splitDetails!.items;
                  // Re-find index in clone
                  const idx = items.findIndex(i => i.name === personName);
                  if (idx !== -1) {
                      items[idx] = {
                          ...items[idx],
                          paidAmount: items[idx].amount, // Cap at amount, effectively withdrawing surplus
                          isSettled: true // Exact match is settled
                      };
                  }
                  updatesMap.set(tx.id, txToUpdate);
              }
          });
          return creditFound;
      };

      // Helper to build item while preserving history AND applying credits
      const createItem = (p: SplitParticipant, amount: number) => {
          const formattedAmount = parseFloat(amount.toFixed(2));
          
          // 1. Get existing state on THIS transaction
          const existingItem = lendingTx.splitDetails?.items.find(i => i.id === p.id);
          let paidAmount = existingItem?.paidAmount || 0;
          const payments = existingItem?.payments || [];

          // 2. Sweep credits from OTHER transactions
          const creditsFromOthers = sweepCreditForPerson(p.name);
          paidAmount += creditsFromOthers;

          // 3. Recalculate settled status based on new amount
          const isSettled = paidAmount >= formattedAmount - 0.01;

          return {
              id: p.id,
              name: p.name,
              amount: formattedAmount,
              paidAmount: paidAmount, // Can exceed amount (credit)
              isSettled: isSettled,
              dateSettled: isSettled && !existingItem?.isSettled ? new Date().toISOString().split('T')[0] : existingItem?.dateSettled,
              payments: payments
          };
      };

      if (splitMode === 'equal') {
         participants.filter(p => p.id !== 'user' && p.isSelected).forEach(p => {
             items.push(createItem(p, splitAmount));
             totalLent += splitAmount;
         });
      } else if (splitMode === 'shares') {
         participants.filter(p => p.id !== 'user').forEach(p => {
             const amount = (p.shares || 0) * shareUnitValue;
             if (amount > 0) {
                 items.push(createItem(p, amount));
                 totalLent += amount;
             }
         });
      } else {
         // Exact Mode
         participants.filter(p => p.id !== 'user').forEach(p => {
             if (p.amount > 0) {
                items.push(createItem(p, p.amount));
                totalLent += p.amount;
             }
         });
      }

      const updatedCurrentTx = {
        ...lendingTx,
        status: 'verified' as const,
        isReviewed: true,
        splitDetails: items.length === 0 ? undefined : {
            totalLent: parseFloat(totalLent.toFixed(2)),
            items,
            splitType: splitMode,
            dateLent: lendingTx.splitDetails?.dateLent || new Date().toISOString().split('T')[0]
        }
      };
      
      // Add current tx to updates map
      updatesMap.set(lendingTx.id, updatedCurrentTx);

      onUpdateTransaction(Array.from(updatesMap.values()));
      setLendingTx(null);
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === displayed.length && displayed.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map(t => t.id)));
    }
  };

  const executeBulkReview = (status: boolean) => {
    if (onBulkReview) {
      onBulkReview(Array.from(selectedIds), status);
      setSelectedIds(new Set());
    }
  };

  const executeBulkDelete = () => {
    if (onBulkDelete && confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <>
      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Bulk Action Header (Conditional) */}
        {selectedIds.size > 0 ? (
          <div className="p-4 bg-indigo-600 text-white flex items-center justify-between animate-fade-in">
             <div className="flex items-center gap-4">
               <span className="font-semibold">{selectedIds.size} selected</span>
               <div className="h-4 w-px bg-indigo-400"></div>
               <button onClick={() => setSelectedIds(new Set())} className="text-sm text-indigo-100 hover:text-white">Deselect All</button>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => executeBulkReview(true)}
                 className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
               >
                 <Eye size={16} /> Mark Reviewed
               </button>
               <button 
                 onClick={() => executeBulkReview(false)}
                 className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
               >
                 <EyeOff size={16} /> Mark Unreviewed
               </button>
               <button 
                 onClick={executeBulkDelete}
                 className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ml-2"
               >
                 <Trash2 size={16} /> Delete
               </button>
             </div>
          </div>
        ) : (
          <div className="p-6 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Transactions</h2>
            
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search description or tags..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 placeholder-slate-500"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="relative">
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-4 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>

                <div className="relative">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="pl-4 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="All">All Status</option>
                    <option value="Unreviewed">To Review</option>
                    <option value="Reviewed">Reviewed</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     {statusFilter === 'Unreviewed' && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <button onClick={toggleAll} className="text-slate-500 hover:text-indigo-400">
                    {selectedIds.size > 0 && selectedIds.size === displayed.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-4 py-4 w-32">Date</th>
                <th className="px-4 py-4">Description</th>
                <th className="px-4 py-4 w-40">Category</th>
                <th className="px-4 py-4 w-48">Source</th>
                <th className="px-4 py-4 text-right w-32">Amount</th>
                <th className="px-4 py-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                       <Search size={24} className="opacity-20" />
                       <p>No transactions found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((t) => (
                  <tr 
                    key={t.id} 
                    className={`
                      group transition-colors text-slate-300
                      ${selectedIds.has(t.id) ? 'bg-indigo-900/20' : 'hover:bg-slate-800/50'}
                    `}
                  >
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => toggleSelection(t.id)}
                        className={`${selectedIds.has(t.id) ? 'text-indigo-400' : 'text-slate-600 hover:text-indigo-400'}`}
                      >
                        {selectedIds.has(t.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        {!t.isReviewed && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" title="Unreviewed transaction"></div>
                        )}
                        <span className={!t.isReviewed ? "text-white font-semibold" : "text-slate-400"}>
                          {t.date}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold text-white">{t.enhancedDescription}</span>
                           {t.status === 'needs_review' && (
                             <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Low confidence prediction">
                               <AlertTriangle size={10} className="mr-1" /> Check
                             </span>
                           )}
                           {t.splitDetails && t.splitDetails.items.length > 0 && (
                             <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20`} title="Split transaction">
                               <HandCoins size={10} className="mr-1" /> 
                               {t.splitDetails.items.length === 1 ? t.splitDetails.items[0].name : `${t.splitDetails.items.length} People`}
                             </span>
                           )}
                        </div>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{t.originalDescription}</span>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.tags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                                <Hash size={8} className="mr-0.5 opacity-50" /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getCategoryColor(t.category)}20`, 
                          color: getCategoryColor(t.category) 
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{t.source}</td>
                    <td className={`px-4 py-4 text-right font-bold text-sm ${t.isExpense ? 'text-slate-200' : 'text-emerald-400'}`}>
                      {t.isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                       <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => openLendModal(t)}
                           className={`p-1.5 rounded-md transition-colors ${t.splitDetails ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                           title="Lend / Split"
                         >
                           <HandCoins size={16} />
                         </button>
                         <button 
                           onClick={() => onBulkReview && onBulkReview([t.id], !t.isReviewed)}
                           className={`p-1.5 rounded-md transition-colors ${t.isReviewed ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800'}`}
                           title={t.isReviewed ? "Mark as Unreviewed" : "Mark as Reviewed"}
                         >
                           {t.isReviewed ? <Eye size={16} /> : <Check size={16} />}
                         </button>
                         <button 
                          onClick={() => setEditingTx(t)}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                          title="Edit Transaction"
                         >
                           <Edit2 size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-500 bg-slate-900">
          <span>Showing {Math.min(filtered.length, (page - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, page * itemsPerPage)} of {filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {totalPages || 1}</span>
            <button 
               onClick={() => setPage(p => Math.min(totalPages, p + 1))}
               disabled={page === totalPages || totalPages === 0}
               className="p-2 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit Transaction</h3>
              <button 
                onClick={() => setEditingTx(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-400">Date</label>
                  <input 
                    type="date" 
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({...editingTx, date: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-400">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({...editingTx, amount: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-400">Description</label>
                <input 
                  type="text" 
                  value={editingTx.enhancedDescription}
                  onChange={(e) => setEditingTx({...editingTx, enhancedDescription: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  required
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-400">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={editingTx.tags?.join(', ') || ''}
                  onChange={(e) => setEditingTx({...editingTx, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="e.g. coffee, starbucks, weekend"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/50 flex items-center gap-2"
                >
                  <Check size={18} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lend / Split Modal */}
      {lendingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">Split Transaction</h3>
              <button 
                onClick={() => setLendingTx(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{lendingTx.enhancedDescription}</p>
                    <p className="text-sm text-slate-500">Total Bill</p>
                  </div>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(lendingTx.amount)}
                  </p>
              </div>

              {/* Split Mode Toggle */}
              <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setSplitMode('equal')}
                    className={`flex-1 py-2 px-1 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${splitMode === 'equal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Users size={16} /> Equally
                  </button>
                  <button 
                    onClick={() => setSplitMode('shares')}
                    className={`flex-1 py-2 px-1 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${splitMode === 'shares' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <PieChart size={16} /> Shares
                  </button>
                  <button 
                    onClick={() => setSplitMode('exact')}
                    className={`flex-1 py-2 px-1 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${splitMode === 'exact' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Calculator size={16} /> Exact
                  </button>
              </div>

              {/* Add People */}
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-400">Who is involved?</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add person by name..." 
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder-slate-600"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                    />
                    <button 
                      onClick={addParticipant}
                      className="px-3 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                 </div>
              </div>

              {/* List of People */}
              <div className="space-y-3">
                 {participants.map(p => (
                   <div key={p.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        {p.id !== 'user' && (
                            <button onClick={() => removeParticipant(p.id)} className="text-slate-500 hover:text-rose-500">
                                <Trash2 size={16} />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.id === 'user' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                              {p.name.charAt(0).toUpperCase()}
                           </div>
                           <span className={p.id === 'user' ? 'font-semibold text-white' : 'text-slate-300'}>{p.name}</span>
                        </div>
                      </div>

                      {splitMode === 'equal' && (
                        <div className="flex items-center gap-3">
                           {p.isSelected && (
                               <span className="text-sm font-medium text-slate-300">
                                 {formatCurrency(splitAmount)}
                               </span>
                           )}
                           <button 
                             onClick={() => toggleParticipantSelection(p.id)}
                             className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${p.isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-slate-600'}`}
                           >
                             {p.isSelected && <Check size={12} />}
                           </button>
                        </div>
                      )}

                      {splitMode === 'shares' && (
                        <div className="flex items-center gap-3">
                           <span className="text-sm font-medium text-slate-400 min-w-[60px] text-right">
                             {formatCurrency((p.shares || 0) * shareUnitValue)}
                           </span>
                           <div className="flex items-center border border-slate-700 rounded-lg bg-slate-950 overflow-hidden">
                              <span className="px-2 text-xs text-slate-500 border-r border-slate-800 bg-slate-900 h-full flex items-center">Share</span>
                              <input 
                                type="number" 
                                min="0"
                                className="w-12 py-1 px-1 text-center focus:outline-none text-sm font-medium bg-transparent text-white"
                                value={p.shares}
                                onChange={(e) => updateParticipantShares(p.id, parseInt(e.target.value) || 0)}
                              />
                           </div>
                        </div>
                      )}

                      {splitMode === 'exact' && (
                        <div className="flex items-center gap-2">
                           {p.id === 'user' ? (
                             <span className="text-sm font-medium text-slate-400 px-3 py-2">
                               {formatCurrency(remainingExact)}
                             </span>
                           ) : (
                             <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                <input 
                                  type="number" 
                                  className="w-full pl-5 pr-2 py-1.5 text-right bg-slate-950 border border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
                                  value={p.amount || ''}
                                  placeholder="0.00"
                                  onChange={(e) => updateParticipantAmount(p.id, parseFloat(e.target.value))}
                                />
                             </div>
                           )}
                        </div>
                      )}
                   </div>
                 ))}
              </div>
              
              {/* Summary */}
              {splitMode === 'exact' && remainingExact < 0 && (
                 <div className="p-3 bg-rose-500/10 text-rose-400 text-sm rounded-lg flex items-start gap-2 border border-rose-500/20">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>The amounts exceed the total bill by {formatCurrency(Math.abs(remainingExact))}.</span>
                 </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-900">
              <button 
                type="button"
                onClick={() => setLendingTx(null)}
                className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLendSave}
                disabled={splitMode === 'exact' && Math.abs(remainingExact) > 0.01 && remainingExact < 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/50 flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={18} />
                Save Split
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
