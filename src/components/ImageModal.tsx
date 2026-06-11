import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageModal({ isOpen, imageUrl, onClose }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-5xl w-full bg-card rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-text">Trade Chart Screenshot</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted hover:text-text hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 overflow-auto max-h-[80vh] flex justify-center bg-slate-900">
            <img
              src={imageUrl}
              alt="Trade Screenshot"
              className="max-w-full h-auto object-contain rounded-lg"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
