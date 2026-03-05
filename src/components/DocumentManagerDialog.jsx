import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Download, X, File, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DocumentManagerDialog = ({ open, onOpenChange, operacion, onUpdate }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!operacion) return null;

  const documents = operacion.documentos || [];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: (file.size / 1024).toFixed(2) + ' KB',
      date: new Date().toISOString(),
      url: URL.createObjectURL(file) // Simulated URL
    }));

    const updatedOperacion = {
      ...operacion,
      documentos: [...documents, ...newDocs]
    };

    onUpdate(updatedOperacion);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (docId) => {
    const updatedDocs = documents.filter(d => d.id !== docId);
    onUpdate({ ...operacion, documentos: updatedDocs });
  };

  const getFileIcon = (type) => {
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-blue-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 bg-white overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Expediente Digital</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Referencia: <span className="font-mono font-medium text-blue-600">{operacion.referencia}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full border border-slate-300">
                    {documents.length} Archivos
                </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
           {/* Upload Area */}
           <div 
             className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 cursor-pointer group relative overflow-hidden
               ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-white bg-white'}`}
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={() => setIsDragging(false)}
             onDrop={(e) => {
               e.preventDefault();
               setIsDragging(false);
               handleFileUpload({ target: { files: e.dataTransfer.files } });
             }}
             onClick={() => fileInputRef.current?.click()}
           >
             <input 
               type="file" 
               multiple 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileUpload}
             />
             <div className="relative z-10">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
                </div>
                <p className="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">Click para subir o arrastra archivos aquí</p>
                <p className="text-slate-500 text-sm mt-1">PDF, Imágenes, Excel (Max 10MB)</p>
             </div>
           </div>

           {/* File List */}
           <div className="space-y-3">
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-1">Archivos en carpeta</h3>
             <AnimatePresence>
               {documents.length > 0 ? (
                 documents.map((doc) => (
                   <motion.div
                     key={doc.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all hover:shadow-md"
                   >
                     <div className="flex items-center gap-4 overflow-hidden">
                       <div className="bg-slate-50 p-2 rounded-lg shrink-0 group-hover:bg-blue-50 transition-colors">
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
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                         <Download className="w-4 h-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                         onClick={() => handleDelete(doc.id)}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                   <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                   <p>Carpeta vacía</p>
                 </div>
               )}
             </AnimatePresence>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentManagerDialog;