import React from "react";
import Papa from "papaparse";

interface FileHandlerProps {
  onDataParsed: (data: any[]) => void;
}

const FileHandler: React.FC<FileHandlerProps> = ({ onDataParsed }) => {
  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (result) => {
        onDataParsed(result.data as any[]);
      },
    });
  };

  return null; // This component doesn't render anything, just logic
};

export default FileHandler;
