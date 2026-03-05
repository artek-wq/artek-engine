import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Download, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VentasDocumentDialog = ({ open, onOpenChange, entity, onUpdate }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!entity) return null;

  const documents = entity.documentos || [];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: (file.size / 1024).toFixed(2) + ' KB',
      date: new Date().toISOString(),
      url: URL.createObjectURL(file) // Simulated
    }));

    const updatedEntity = {
      ...entity,
      documentos: [...documents, ...newDocs]
    };

    onUpdate(updatedEntity);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (docId) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    onUpdate({ ...entity, documentos: updatedDocs });
  };

  const getFileIcon = (type) => {
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 bg-white overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FolderOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Carpeta de Ventas</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Prospecto: <span className="font-semibold text-indigo-600">{entity.empresa}</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full border border-slate-300">
                {documents.length} Archivos
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
           {/* Upload Area */}
           <div 
             className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 cursor-pointer group relative overflow-hidden
               ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-white bg-white'}`}
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={() => setIsDragging(false)}
             onDrop={(e) => {
               e.preventDefault();
               setIsDragging(false);
               handleFileUpload({ target: { files: e.dataTransfer.files } });
             }}
             onClick={() => fileInputRef.current?.click()}
           >
             <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             <div className="relative z-10">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-slate-900 font-medium group-hover:text-indigo-600 transition-colors">Subir cotizaciones o archivos</p>
                <p className="text-slate-500 text-sm mt-1">Arrastra aquí o haz click</p>
             </div>
           </div>

           {/* File List */}
           <div className="space-y-3">
             <AnimatePresence>
               {documents.length > 0 ? (
                 documents.map((doc) => (
                   <motion.div
                     key={doc.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all hover:shadow-md"
                   >
                     <div className="flex items-center gap-4 overflow-hidden">
                       <div className="bg-slate-50 p-2 rounded-lg shrink-0 group-hover:bg-indigo-50 transition-colors">
                         {getFileIcon(doc.type || '')}
                       </div>
                       <div className="min-w-0">
                         <h4 className="font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</h4>
                         <p className="text-xs text-slate-500 flex items-center gap-2">
                           <span>{doc.size}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span>{new Date(doc.date).toLocaleDateString()}</span>
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                         <Download className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <div className="text-center py-8 text-slate-400">
                   <p className="text-sm">Carpeta vacía</p>
                 </div>
               )}
             </AnimatePresence>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VentasDocumentDialog;