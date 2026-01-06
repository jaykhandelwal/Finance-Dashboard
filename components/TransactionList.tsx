import React, { useState, useMemo } from 'react';
import { Transaction, Category, SplitItem } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, Edit2, X, Check, Hash, AlertTriangle, Trash2, CheckSquare, Square, Eye, EyeOff, HandCoins, Users, Calculator, PieChart, Plus } from 'lucide-react';

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

// Separate interface for the form to handle raw strings during input
interface EditFormData {
  date: string;
  amount: string;
  enhancedDescription: string;
  category: string;
  tags: string;
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
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
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

  const handleStartEdit = (t: Transaction) => {
    setEditingTx(t);
    setEditForm({
        date: t.date,
        amount: t.amount.toString(),
        enhancedDescription: t.enhancedDescription,
        category: t.category,
        tags: t.tags ? t.tags.join(', ') : ''
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx && editForm && onUpdateTransaction) {
      // If manually edited, we assume it's now verified and reviewed
      const updatedTx: Transaction = {
          ...editingTx,
          date: editForm.date,
          amount: parseFloat(editForm.amount) || 0,
          enhancedDescription: editForm.enhancedDescription,
          category: editForm.category,
          tags: editForm.tags.split(',').map(s => s.trim()).filter(Boolean),
          status: 'verified',
          confidence: 100,
          isReviewed: true
      };
      
      onUpdateTransaction(updatedTx);
      setEditingTx(null);
      setEditForm(null);
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
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col h-full overflow-hidden">
        {/* Bulk Action Header (Conditional) */}
        {selectedIds.size > 0 ? (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-indigo-900 flex items-center justify-between animate-fade-in">
             <div className="flex items-center gap-4">
               <span className="font-bold">{selectedIds.size} selected</span>
               <div className="h-4 w-px bg-indigo-200"></div>
               <button onClick={() => setSelectedIds(new Set())} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Deselect All</button>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => executeBulkReview(true)}
                 className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 shadow-sm rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-indigo-50 transition-colors"
               >
                 <Eye size={16} /> Mark Reviewed
               </button>
               <button 
                 onClick={() => executeBulkReview(false)}
                 className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 shadow-sm rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-indigo-50 transition-colors"
               >
                 <EyeOff size={16} /> Mark Unreviewed
               </button>
               <button 
                 onClick={executeBulkDelete}
                 className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 shadow-sm rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-rose-100 transition-colors ml-2"
               >
                 <Trash2 size={16} /> Delete
               </button>
             </div>
          </div>
        ) : (
          <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">Transactions</h2>
            
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search description or tags..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 placeholder-slate-400 font-medium"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="relative">
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer font-medium"
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
                    className="pl-4 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer font-medium"
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
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {selectedIds.size > 0 && selectedIds.size === displayed.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-6 py-4 w-32">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 w-40">Category</th>
                <th className="px-6 py-4 w-48">Source</th>
                <th className="px-6 py-4 text-right w-32">Amount</th>
                <th className="px-6 py-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                       <div className="p-4 bg-slate-50 rounded-full">
                         <Search size={24} className="opacity-40" />
                       </div>
                       <p className="font-medium">No transactions found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((t) => (
                  <tr 
                    key={t.id} 
                    className={`
                      group transition-colors
                      ${selectedIds.has(t.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}
                    `}
                  >
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleSelection(t.id)}
                        className={`${selectedIds.has(t.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                      >
                        {selectedIds.has(t.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        {!t.isReviewed && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 shadow-sm shadow-indigo-200" title="Unreviewed transaction"></div>
                        )}
                        <span className={!t.isReviewed ? "text-slate-900 font-bold" : "text-slate-500"}>
                          {t.date}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-800">{t.enhancedDescription}</span>
                           {t.status === 'needs_review' && (
                             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200" title="Low confidence prediction">
                               <AlertTriangle size={10} className="mr-1" /> Check
                             </span>
                           )}
                           {t.splitDetails && t.splitDetails.items.length > 0 && (
                             <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200`} title="Split transaction">
                               <HandCoins size={10} className="mr-1" /> 
                               {t.splitDetails.items.length === 1 ? t.splitDetails.items[0].name : `${t.splitDetails.items.length} People`}
                             </span>
                           )}
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{t.originalDescription}</span>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.tags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <Hash size={8} className="mr-0.5 opacity-50" /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        style={{ 
                          backgroundColor: `${getCategoryColor(t.category)}15`, 
                          color: getCategoryColor(t.category),
                          border: `1px solid ${getCategoryColor(t.category)}30`
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{t.source}</td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${t.isExpense ? 'text-slate-800' : 'text-emerald-600'}`}>
                      {t.isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => openLendModal(t)}
                           className={`p-2 rounded-lg transition-colors ${t.splitDetails ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                           title="Lend / Split"
                         >
                           <HandCoins size={16} />
                         </button>
                         <button 
                           onClick={() => onBulkReview && onBulkReview([t.id], !t.isReviewed)}
                           className={`p-2 rounded-lg transition-colors ${t.isReviewed ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                           title={t.isReviewed ? "Mark as Unreviewed" : "Mark as Reviewed"}
                         >
                           {t.isReviewed ? <Eye size={16} /> : <Check size={16} />}
                         </button>
                         <button 
                          onClick={() => handleStartEdit(t)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-white">
          <span className="font-medium">Showing {Math.min(filtered.length, (page - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, page * itemsPerPage)} of {filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-slate-700">Page {page} of {totalPages || 1}</span>
            <button 
               onClick={() => setPage(p => Math.min(totalPages, p + 1))}
               disabled={page === totalPages || totalPages === 0}
               className="p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTx && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 transform transition-all">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-xl font-bold text-slate-800">Edit Transaction</h3>
              <button 
                onClick={() => { setEditingTx(null); setEditForm(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Date</label>
                  <input 
                    type="date" 
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm font-medium"
                    required
                  />
                </div>
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
                        required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Description</label>
                <input 
                  type="text" 
                  value={editForm.enhancedDescription}
                  onChange={(e) => setEditForm({...editForm, enhancedDescription: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm font-medium"
                  required
                />
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

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={editForm.tags}
                  onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                  placeholder="e.g. coffee, starbucks, weekend"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm placeholder-slate-400 font-medium"
                />
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-50">
                <button 
                  type="button"
                  onClick={() => { setEditingTx(null); setEditForm(null); }}
                  className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 transform hover:-translate-y-0.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-xl font-bold text-slate-800">Split Transaction</h3>
              <button 
                onClick={() => setLendingTx(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-indigo-900">{lendingTx.enhancedDescription}</p>
                    <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wide mt-1">Total Bill</p>
                  </div>
                  <p className="text-2xl font-extrabold text-indigo-700">
                    {formatCurrency(lendingTx.amount)}
                  </p>
              </div>

              {/* Split Mode Toggle */}
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                  <button 
                    onClick={() => setSplitMode('equal')}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${splitMode === 'equal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Users size={16} /> Equally
                  </button>
                  <button 
                    onClick={() => setSplitMode('shares')}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${splitMode === 'shares' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <PieChart size={16} /> Shares
                  </button>
                  <button 
                    onClick={() => setSplitMode('exact')}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${splitMode === 'exact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Calculator size={16} /> Exact
                  </button>
              </div>

              {/* Add People */}
              <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-600">Who is involved?</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add person by name..." 
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 placeholder-slate-400 font-medium shadow-sm"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                    />
                    <button 
                      onClick={addParticipant}
                      className="px-3.5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                 </div>
              </div>

              {/* List of People */}
              <div className="space-y-3">
                 {participants.map(p => (
                   <div key={p.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-xl transition-colors -mx-2">
                      <div className="flex items-center gap-3">
                        {p.id !== 'user' && (
                            <button onClick={() => removeParticipant(p.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                           <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${p.id === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-slate-500'}`}>
                              {p.name.charAt(0).toUpperCase()}
                           </div>
                           <span className={`font-bold ${p.id === 'user' ? 'text-slate-800' : 'text-slate-600'}`}>{p.name}</span>
                        </div>
                      </div>

                      {splitMode === 'equal' && (
                        <div className="flex items-center gap-3">
                           {p.isSelected && (
                               <span className="text-sm font-bold text-slate-700">
                                 {formatCurrency(splitAmount)}
                               </span>
                           )}
                           <button 
                             onClick={() => toggleParticipantSelection(p.id)}
                             className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shadow-sm ${p.isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}
                           >
                             {p.isSelected && <Check size={14} strokeWidth={3} />}
                           </button>
                        </div>
                      )}

                      {splitMode === 'shares' && (
                        <div className="flex items-center gap-3">
                           <span className="text-sm font-bold text-slate-500 min-w-[60px] text-right">
                             {formatCurrency((p.shares || 0) * shareUnitValue)}
                           </span>
                           <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                              <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-100 bg-slate-50 h-full flex items-center uppercase">Share</span>
                              <input 
                                type="number" 
                                min="0"
                                className="w-12 py-1.5 px-1 text-center focus:outline-none text-sm font-bold bg-transparent text-slate-800"
                                value={p.shares}
                                onChange={(e) => updateParticipantShares(p.id, parseInt(e.target.value) || 0)}
                              />
                           </div>
                        </div>
                      )}

                      {splitMode === 'exact' && (
                        <div className="flex items-center gap-2">
                           {p.id === 'user' ? (
                             <span className="text-sm font-bold text-slate-400 px-3 py-2">
                               {formatCurrency(remainingExact)}
                             </span>
                           ) : (
                             <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                <input 
                                  type="number" 
                                  className="w-full pl-6 pr-3 py-1.5 text-right bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-300 font-bold shadow-sm"
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
                 <div className="p-3 bg-rose-50 text-rose-600 text-sm font-medium rounded-xl flex items-start gap-2 border border-rose-100">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>The amounts exceed the total bill by {formatCurrency(Math.abs(remainingExact))}.</span>
                 </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white">
              <button 
                type="button"
                onClick={() => setLendingTx(null)}
                className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLendSave}
                disabled={splitMode === 'exact' && Math.abs(remainingExact) > 0.01 && remainingExact < 0}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5"
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