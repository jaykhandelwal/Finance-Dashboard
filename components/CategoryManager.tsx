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
        <h2 className="text-2xl font-bold text-slate-800">Manage Categories</h2>
        <p className="text-slate-500 font-medium">Customize how AI tags your transactions by defining your own categories.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Add New Category</h3>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-bold text-slate-600">Category Name</label>
            <input 
              type="text" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g., Subscriptions"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">Color</label>
            <input 
              type="color" 
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="block w-20 h-12 p-1 bg-white border border-slate-200 rounded-xl cursor-pointer"
            />
          </div>
          <button 
            type="submit" 
            disabled={!newCatName.trim()}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-12 shadow-md shadow-indigo-200"
          >
            <Plus size={20} />
            Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
           <h3 className="text-lg font-bold text-slate-800">Current Categories</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border border-slate-100" style={{backgroundColor: `${cat.color}20`}}>
                   <Tag size={16} style={{color: cat.color}} />
                </div>
                <span className="font-bold text-slate-700">{cat.name}</span>
              </div>
              <button 
                onClick={() => onDeleteCategory(cat.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-2.5 rounded-lg hover:bg-rose-50"
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
