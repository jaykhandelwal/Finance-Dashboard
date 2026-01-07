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
        <h2 className="text-2xl font-bold text-white">Manage Tags</h2>
        <p className="text-slate-400">View and organize tags used across all your transactions. Renaming a tag here updates it everywhere.</p>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
           <h3 className="text-lg font-semibold text-white">Active Tags ({tagStats.length})</h3>
        </div>
        
        {tagStats.length === 0 ? (
           <div className="p-12 text-center text-slate-500">
             No tags found in your transactions yet.
           </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tagStats.map(([tag, count]) => (
              <div key={tag} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                     <Tag size={14} />
                  </div>
                  
                  {editingTag === tag ? (
                    <div className="flex items-center gap-2">
                      <input 
                        className="px-2 py-1 bg-slate-950 border border-indigo-500 rounded text-sm focus:outline-none text-white"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <button onClick={saveEdit} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"><Save size={16} /></button>
                      <button onClick={() => setEditingTag(null)} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-300">{tag}</span>
                      <span className="text-xs text-slate-500">{count} transaction{count !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {!editingTag && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(tag)}
                      className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Rename Tag"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteTag(tag)}
                      className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Tag"
                    >
                      <Trash2 size={16} />
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