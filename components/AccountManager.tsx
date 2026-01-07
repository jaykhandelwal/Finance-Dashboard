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
          <h2 className="text-2xl font-bold text-white">Accounts</h2>
          <p className="text-slate-400">Manage your connected bank accounts and credit cards.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setFormData({ type: 'bank', color: '#3b82f6' }); }}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-900/50"
          >
            <Plus size={18} />
            Add Account
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/30 shadow-sm animate-fade-in">
          <h3 className="text-lg font-semibold text-white mb-4">{editingId ? 'Edit Account' : 'Add New Account'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-400">Account Name</label>
               <input 
                 type="text" 
                 placeholder="e.g. Chase Sapphire"
                 value={formData.name || ''}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
               />
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-400">Institution</label>
               <input 
                 type="text" 
                 placeholder="e.g. Chase"
                 value={formData.institution || ''}
                 onChange={e => setFormData({...formData, institution: e.target.value})}
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
               />
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-400">Type</label>
               <select 
                 value={formData.type} 
                 onChange={e => setFormData({...formData, type: e.target.value as any})}
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
               >
                 <option value="bank">Bank Account</option>
                 <option value="credit_card">Credit Card</option>
                 <option value="wallet">Digital Wallet</option>
                 <option value="other">Other</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-400">Last 4 Digits (Optional)</label>
               <input 
                 type="text" 
                 placeholder="1234"
                 maxLength={4}
                 value={formData.last4Digits || ''}
                 onChange={e => setFormData({...formData, last4Digits: e.target.value})}
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
               />
             </div>
             <div className="space-y-1">
               <label className="text-sm font-medium text-slate-400">Color Tag</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="color" 
                   value={formData.color}
                   onChange={e => setFormData({...formData, color: e.target.value})}
                   className="w-10 h-10 p-1 bg-slate-950 border border-slate-700 rounded cursor-pointer"
                 />
                 <span className="text-xs text-slate-500">Pick a color to identify this account</span>
               </div>
             </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={cancelEdit} className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg">Cancel</button>
            <button 
              onClick={handleSave}
              disabled={!formData.name}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {editingId ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(account => {
          const Icon = getIcon(account.type);
          return (
            <div key={account.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{backgroundColor: account.color}}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{account.name}</h3>
                    <p className="text-xs text-slate-500">{account.institution} {account.last4Digits ? `(••• ${account.last4Digits})` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(account)} className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10"><Edit2 size={16} /></button>
                  <button onClick={() => onDeleteAccount(account.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex gap-2">
                 <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded capitalize">{account.type.replace('_', ' ')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};