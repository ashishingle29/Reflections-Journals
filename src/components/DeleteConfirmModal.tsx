import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div 
        className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 id="delete-dialog-title" className="font-medium text-base text-stone-100">
              Delete Reflection
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-stone-300 leading-relaxed">
            Are you sure you want to delete <span className="text-stone-100 font-semibold font-serif">"{title || 'Untitled Reflection'}"</span>?
          </p>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300/90 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>
              This will permanently remove this reflection and its multi-turn conversations from your Cloud Firestore account. This action cannot be undone.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-stone-950/60 border-t border-stone-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-delete-entry"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl shadow transition cursor-pointer disabled:opacity-50 min-h-[36px]"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Reflection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
