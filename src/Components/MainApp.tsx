import React, { useState } from "react";
import Toolbar from "./Toolbar";
import Chart from "./Chart";
import Papa from "papaparse";

const MainApp: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  const handleDownload = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "data.csv");
    link.click();
  };

  const handleUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (result) => {
        setData(result.data as any[]);
      },
    });
  };

  const handleRefresh = () => {
    // Refresh logic here
    console.log("Data refreshed");
  };

  return (
    <div className="p-4">
      <Toolbar onDownload={handleDownload} onUpload={handleUpload} onRefresh={handleRefresh} />
      <Chart data={data} />
    </div>
  );
};

export default MainApp;
