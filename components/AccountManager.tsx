import React, { useState } from 'react';
import { Account } from '../types';
import { Plus, Trash2, CreditCard, Building2, Wallet, MoreHorizontal, Edit2, X, Check } from 'lucide-react';

interface AccountManagerProps {
  accounts: Account[];
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Account>>({
    type: 'bank',
    color: '#3b82f6'
  });

  const getIcon = (type: Account['type']) => {
    switch (type) {
      case 'credit_card': return CreditCard;
      case 'bank': return Building2;
      default: return Wallet;
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingId) {
      // Update
      const existing = accounts.find(a => a.id === editingId);
      if (existing) {
        onUpdateAccount({ ...existing, ...formData } as Account);
      }
      setEditingId(null);
    } else {
      // Add
      onAddAccount({
        name: formData.name,
        type: formData.type as any || 'bank',
        last4Digits: formData.last4Digits,
        color: formData.color || '#3b82f6',
        institution: formData.institution
      });
      setIsAdding(false);
    }
    setFormData({ type: 'bank', color: '#3b82f6', name: '', last4Digits: '', institution: '' });
  };

  const startEdit = (acc: Account) => {
    setEditingId(acc.id);
    setFormData({ ...acc });
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ type: 'bank', color: '#3b82f6' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Accounts</h2>
          <p className="text-slate-500 font-medium">Manage your connected bank accounts and credit cards.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setFormData({ type: 'bank', color: '#3b82f6' }); }}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Add Account
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/50 animate-fade-in relative">
          <button onClick={cancelEdit} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
             <X size={20} />
          </button>
          <h3 className="text-xl font-bold text-slate-800 mb-6">{editingId ? 'Edit Account' : 'Add New Account'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-600">Account Name</label>
               <input 
                 type="text" 
                 placeholder="e.g. Chase Sapphire"
                 value={formData.name || ''}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-600">Institution</label>
               <input 
                 type="text" 
                 placeholder="e.g. Chase"
                 value={formData.institution || ''}
                 onChange={e => setFormData({...formData, institution: e.target.value})}
                 className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-600">Type</label>
               <div className="relative">
                <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium appearance-none cursor-pointer"
                >
                    <option value="bank">Bank Account</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="wallet">Digital Wallet</option>
                    <option value="other">Other</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
               </div>
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-600">Last 4 Digits (Optional)</label>
               <input 
                 type="text" 
                 placeholder="1234"
                 maxLength={4}
                 value={formData.last4Digits || ''}
                 onChange={e => setFormData({...formData, last4Digits: e.target.value})}
                 className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-600">Color Tag</label>
               <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                 <input 
                   type="color" 
                   value={formData.color}
                   onChange={e => setFormData({...formData, color: e.target.value})}
                   className="w-12 h-10 p-1 bg-white border border-slate-200 rounded-lg cursor-pointer"
                 />
                 <span className="text-xs text-slate-500 font-medium">Pick a color to identify this account</span>
               </div>
             </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button onClick={cancelEdit} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors">Cancel</button>
            <button 
              onClick={handleSave}
              disabled={!formData.name}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-md shadow-indigo-200"
            >
              {editingId ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map(account => {
          const Icon = getIcon(account.type);
          return (
            <div key={account.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all relative group cursor-default">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transform group-hover:scale-105 transition-transform" style={{backgroundColor: account.color}}>
                    <Icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{account.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">{account.institution} {account.last4Digits ? `(••• ${account.last4Digits})` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                  <button onClick={() => startEdit(account)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Edit2 size={18} /></button>
                  <button onClick={() => onDeleteAccount(account.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="flex gap-2">
                 <span className="text-xs px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg capitalize font-bold border border-slate-100">{account.type.replace('_', ' ')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
