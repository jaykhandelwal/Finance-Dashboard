import React, { useState } from 'react';
import { Category } from '../types';
import { Plus, Trash2, Tag } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onAddCategory, onDeleteCategory }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim(), newCatColor);
      setNewCatName('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Manage Categories</h2>
        <p className="text-slate-400">Customize how AI tags your transactions by defining your own categories.</p>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Add New Category</h3>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm text-slate-400">Category Name</label>
            <input 
              type="text" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g., Subscriptions"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Color</label>
            <input 
              type="color" 
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="block w-16 h-10 p-1 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer"
            />
          </div>
          <button 
            type="submit" 
            disabled={!newCatName.trim()}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-10"
          >
            <Plus size={18} />
            Add
          </button>
        </form>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
           <h3 className="text-lg font-semibold text-white">Current Categories</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: `${cat.color}20`}}>
                   <Tag size={14} style={{color: cat.color}} />
                </div>
                <span className="font-medium text-slate-300">{cat.name}</span>
              </div>
              <button 
                onClick={() => onDeleteCategory(cat.id)}
                className="text-slate-500 hover:text-rose-500 transition-colors p-2 rounded-md hover:bg-rose-500/10"
                title="Delete Category"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};