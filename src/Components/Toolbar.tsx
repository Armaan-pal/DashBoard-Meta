import React from "react";
import { Download, Upload, Share2, RefreshCcw, Database, Search, Calendar } from "lucide-react";

interface ToolbarProps {
  onDownload: () => void;
  onUpload: (file: File) => void;
  onRefresh: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onDownload, onUpload, onRefresh }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex gap-2 p-2 border-b border-gray-200">
      <button onClick={onDownload} className="flex items-center gap-1 px-3 py-1 border rounded">
        <Download size={16} /> Download
      </button>
      <label className="flex items-center gap-1 px-3 py-1 border rounded cursor-pointer">
        <Upload size={16} /> Upload
        <input type="file" onChange={handleFileChange} className="hidden" />
      </label>
      <button onClick={onRefresh} className="flex items-center gap-1 px-3 py-1 border rounded">
        <RefreshCcw size={16} /> Refresh
      </button>
      <button className="flex items-center gap-1 px-3 py-1 border rounded">
        <Database size={16} /> Data
      </button>
      <button className="flex items-center gap-1 px-3 py-1 border rounded">
        <Search size={16} /> Search
      </button>
      <button className="flex items-center gap-1 px-3 py-1 border rounded">
        <Calendar size={16} /> Calendar
      </button>
      <button className="flex items-center gap-1 px-3 py-1 border rounded">
        <Share2 size={16} /> Share
      </button>
    </div>
  );
};

export default Toolbar;
