import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Tag, Edit2, Trash2, Save, X } from 'lucide-react';

interface TagManagerProps {
  transactions: Transaction[];
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTag: (tag: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ transactions, onRenameTag, onDeleteTag }) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    transactions.forEach(t => {
      t.tags?.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]); // Sort by usage count
  }, [transactions]);

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const saveEdit = () => {
    if (editingTag && editValue.trim() && editValue !== editingTag) {
      onRenameTag(editingTag, editValue.trim());
    }
    setEditingTag(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Manage Tags</h2>
        <p className="text-slate-500 font-medium">View and organize tags used across all your transactions. Renaming a tag here updates it everywhere.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <h3 className="text-lg font-bold text-slate-800">Active Tags ({tagStats.length})</h3>
        </div>
        
        {tagStats.length === 0 ? (
           <div className="p-12 text-center text-slate-400 font-medium">
             No tags found in your transactions yet.
           </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tagStats.map(([tag, count]) => (
              <div key={tag} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
                     <Tag size={16} />
                  </div>
                  
                  {editingTag === tag ? (
                    <div className="flex items-center gap-2">
                      <input 
                        className="px-3 py-1.5 bg-white border border-indigo-500 rounded-lg text-sm focus:outline-none text-slate-800 font-medium shadow-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <button onClick={saveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                      <button onClick={() => setEditingTag(null)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={18} /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg">{tag}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">{count} transaction{count !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {!editingTag && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(tag)}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Rename Tag"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDeleteTag(tag)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Tag"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
