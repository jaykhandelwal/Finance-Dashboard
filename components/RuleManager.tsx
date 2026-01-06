import React, { useState } from 'react';
import { Rule, Category, Transaction } from '../types';
import { Plus, Trash2, Zap, Save, X, Play, Edit2, CheckCircle } from 'lucide-react';

interface RuleManagerProps {
  rules: Rule[];
  categories: Category[];
  transactionsCount: number;
  onAddRule: (rule: Rule) => void;
  onUpdateRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onRunRules: () => void;
}

export const RuleManager: React.FC<RuleManagerProps> = ({ 
  rules, 
  categories, 
  transactionsCount,
  onAddRule, 
  onUpdateRule, 
  onDeleteRule,
  onRunRules
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  
  // Empty form state
  const initialFormState: Rule = {
    id: '',
    name: '',
    isActive: true,
    criteria: { field: 'originalDescription', operator: 'contains', value: '' },
    actions: { addTags: [] }
  };
  
  const [formData, setFormData] = useState<Rule>(initialFormState);
  const [tagInput, setTagInput] = useState('');

  const handleOpenEditor = (rule?: Rule) => {
    if (rule) {
      setFormData({ ...rule });
      setTagInput(rule.actions.addTags?.join(', ') || '');
    } else {
      setFormData({ ...initialFormState, id: `rule-${Date.now()}` });
      setTagInput('');
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.criteria.value) return;

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    const finalRule = {
      ...formData,
      actions: { ...formData.actions, addTags: tags.length > 0 ? tags : undefined }
    };

    if (rules.some(r => r.id === finalRule.id)) {
      onUpdateRule(finalRule);
    } else {
      onAddRule(finalRule);
    }
    setIsEditing(false);
  };

  const handleRunNow = () => {
    onRunRules();
    setRunSuccess(true);
    setTimeout(() => setRunSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Automation Rules</h2>
          <p className="text-slate-500 font-medium">Create "If This Then That" logic to automatically clean, categorize, and tag transactions.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleRunNow}
                className="px-5 py-2.5 bg-white border border-slate-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 flex items-center gap-2 shadow-sm transition-colors"
            >
                {runSuccess ? <CheckCircle size={18} className="text-emerald-500" /> : <Play size={18} />}
                {runSuccess ? 'Rules Applied!' : 'Run on Existing'}
            </button>
            <button 
                onClick={() => handleOpenEditor()}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-colors transform hover:-translate-y-0.5"
            >
                <Plus size={18} />
                New Rule
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/50 animate-fade-in relative">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-slate-800">{rules.some(r => r.id === formData.id) ? 'Edit Rule' : 'Create New Rule'}</h3>
             <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          <div className="space-y-8">
             {/* Name & Active */}
             <div className="flex gap-6">
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Rule Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Clean up Amazon" 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Status</label>
                    <div className="flex items-center h-12">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                            <span className="ml-3 text-sm font-bold text-slate-600">{formData.isActive ? 'Active' : 'Paused'}</span>
                        </label>
                    </div>
                </div>
             </div>

             <div className="border-t border-slate-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* IF Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-amber-100 text-amber-600 px-2 py-1 rounded-lg text-xs font-extrabold border border-amber-200">IF</div>
                        <span className="text-sm font-bold text-slate-500">Transaction matches...</span>
                    </div>
                    <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <select 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm"
                            value={formData.criteria.field}
                            onChange={e => setFormData({...formData, criteria: { ...formData.criteria, field: e.target.value as any }})}
                        >
                            <option value="originalDescription">Original Description</option>
                            <option value="enhancedDescription">Enhanced Description</option>
                            <option value="amount">Amount</option>
                        </select>

                        <div className="flex gap-2">
                            <select 
                                className="w-1/3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm"
                                value={formData.criteria.operator}
                                onChange={e => setFormData({...formData, criteria: { ...formData.criteria, operator: e.target.value as any }})}
                            >
                                <option value="contains">Contains</option>
                                <option value="equals">Equals</option>
                                <option value="starts_with">Starts With</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                            </select>
                            <input 
                                type="text" 
                                placeholder="Value to match..."
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm"
                                value={formData.criteria.value}
                                onChange={e => setFormData({...formData, criteria: { ...formData.criteria, value: e.target.value }})}
                            />
                        </div>
                    </div>
                 </div>

                 {/* THEN Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-xs font-extrabold border border-emerald-200">THEN</div>
                        <span className="text-sm font-bold text-slate-500">Perform these actions...</span>
                    </div>
                    <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rename Description To</label>
                            <input 
                                type="text" 
                                placeholder="(Optional) New Name"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-medium shadow-sm"
                                value={formData.actions.renameTo || ''}
                                onChange={e => setFormData({...formData, actions: { ...formData.actions, renameTo: e.target.value }})}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Set Category</label>
                            <select 
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-sm"
                                value={formData.actions.setCategory || ''}
                                onChange={e => setFormData({...formData, actions: { ...formData.actions, setCategory: e.target.value || undefined }})}
                            >
                                <option value="">(No Change)</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Add Tags (comma separated)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Work, Subscription"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-medium shadow-sm"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                            />
                        </div>
                    </div>
                 </div>
             </div>

             <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors">Cancel</button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.name || !formData.criteria.value}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                >
                  Save Rule
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between group transition-all ${rule.isActive ? 'bg-white border-slate-200 hover:shadow-md' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
             <div className="flex items-start gap-5">
                <div className={`p-3 rounded-2xl shadow-sm ${rule.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                   <Zap size={24} />
                </div>
                <div>
                    <div className="flex items-center gap-3">
                       <h4 className="font-bold text-slate-800 text-lg">{rule.name}</h4>
                       {!rule.isActive && <span className="text-[10px] uppercase font-extrabold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md">Paused</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-medium">
                        <span className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 shadow-sm">
                           If <span className="text-amber-600 font-bold uppercase">{rule.criteria.field}</span> {rule.criteria.operator.replace('_', ' ')} <span className="text-slate-900 font-bold font-mono">"{rule.criteria.value}"</span>
                        </span>
                        <span className="text-slate-400 self-center">→</span>
                        {rule.actions.renameTo && (
                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 shadow-sm">
                               Rename: <span className="text-emerald-600 font-bold">{rule.actions.renameTo}</span>
                            </span>
                        )}
                        {rule.actions.setCategory && (
                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 shadow-sm">
                               Cat: <span className="text-emerald-600 font-bold">{rule.actions.setCategory}</span>
                            </span>
                        )}
                        {rule.actions.addTags && rule.actions.addTags.length > 0 && (
                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 shadow-sm">
                               Tag: <span className="text-emerald-600 font-bold">{rule.actions.addTags.join(', ')}</span>
                            </span>
                        )}
                    </div>
                </div>
             </div>

             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleOpenEditor(rule)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                    <Edit2 size={20} />
                 </button>
                 <button onClick={() => onDeleteRule(rule.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <Trash2 size={20} />
                 </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};