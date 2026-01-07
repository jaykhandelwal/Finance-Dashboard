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
          <h2 className="text-2xl font-bold text-white">Automation Rules</h2>
          <p className="text-slate-400">Create "If This Then That" logic to automatically clean, categorize, and tag transactions.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleRunNow}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-indigo-400 font-medium rounded-lg hover:bg-slate-700 flex items-center gap-2"
            >
                {runSuccess ? <CheckCircle size={18} className="text-emerald-500" /> : <Play size={18} />}
                {runSuccess ? 'Rules Applied!' : 'Run on Existing'}
            </button>
            <button 
                onClick={() => handleOpenEditor()}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-900/50"
            >
                <Plus size={18} />
                New Rule
            </button>
        </div>
      </div>

      {isEditing && (
        <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/30 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-semibold text-white">{rules.some(r => r.id === formData.id) ? 'Edit Rule' : 'Create New Rule'}</h3>
             <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
          </div>
          
          <div className="space-y-6">
             {/* Name & Active */}
             <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rule Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Clean up Amazon" 
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                    <div className="flex items-center h-10">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-3 text-sm font-medium text-slate-300">{formData.isActive ? 'Active' : 'Paused'}</span>
                        </label>
                    </div>
                </div>
             </div>

             <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* IF Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-amber-500/10 text-amber-500 p-1.5 rounded-md text-xs font-bold border border-amber-500/20">IF</div>
                        <span className="text-sm font-semibold text-slate-300">Transaction matches...</span>
                    </div>
                    <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                        <select 
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formData.criteria.field}
                            onChange={e => setFormData({...formData, criteria: { ...formData.criteria, field: e.target.value as any }})}
                        >
                            <option value="originalDescription">Original Description</option>
                            <option value="enhancedDescription">Enhanced Description</option>
                            <option value="amount">Amount</option>
                        </select>

                        <div className="flex gap-2">
                            <select 
                                className="w-1/3 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={formData.criteria.value}
                                onChange={e => setFormData({...formData, criteria: { ...formData.criteria, value: e.target.value }})}
                            />
                        </div>
                    </div>
                 </div>

                 {/* THEN Section */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-emerald-500/10 text-emerald-500 p-1.5 rounded-md text-xs font-bold border border-emerald-500/20">THEN</div>
                        <span className="text-sm font-semibold text-slate-300">Perform these actions...</span>
                    </div>
                    <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500">Rename Description To</label>
                            <input 
                                type="text" 
                                placeholder="(Optional) New Name"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-700"
                                value={formData.actions.renameTo || ''}
                                onChange={e => setFormData({...formData, actions: { ...formData.actions, renameTo: e.target.value }})}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-500">Set Category</label>
                            <select 
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={formData.actions.setCategory || ''}
                                onChange={e => setFormData({...formData, actions: { ...formData.actions, setCategory: e.target.value || undefined }})}
                            >
                                <option value="">(No Change)</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-500">Add Tags (comma separated)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Work, Subscription"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-700"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                            />
                        </div>
                    </div>
                 </div>
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.name || !formData.criteria.value}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
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
          <div key={rule.id} className={`p-4 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between group transition-all ${rule.isActive ? 'bg-slate-900' : 'bg-slate-900/50 opacity-70'}`}>
             <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${rule.isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                   <Zap size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                       <h4 className="font-bold text-white">{rule.name}</h4>
                       {!rule.isActive && <span className="text-[10px] uppercase font-bold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Paused</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400">
                           If <span className="text-amber-500">{rule.criteria.field}</span> {rule.criteria.operator.replace('_', ' ')} <span className="text-white font-mono">"{rule.criteria.value}"</span>
                        </span>
                        <span className="text-slate-600 self-center">→</span>
                        {rule.actions.renameTo && (
                            <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400">
                               Rename: <span className="text-emerald-400">{rule.actions.renameTo}</span>
                            </span>
                        )}
                        {rule.actions.setCategory && (
                            <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400">
                               Cat: <span className="text-emerald-400">{rule.actions.setCategory}</span>
                            </span>
                        )}
                        {rule.actions.addTags && rule.actions.addTags.length > 0 && (
                            <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400">
                               Tag: <span className="text-emerald-400">{rule.actions.addTags.join(', ')}</span>
                            </span>
                        )}
                    </div>
                </div>
             </div>

             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleOpenEditor(rule)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg">
                    <Edit2 size={18} />
                 </button>
                 <button onClick={() => onDeleteRule(rule.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg">
                    <Trash2 size={18} />
                 </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};