import React from "react";
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Line, Bar } from "recharts";

interface ChartProps {
  data: any[];
}

const Chart: React.FC<ChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid stroke="#f5f5f5" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="areaValue" fill="#8884d8" stroke="#8884d8" />
        <Bar dataKey="barValue" barSize={20} fill="#413ea0" />
        <Line type="monotone" dataKey="lineValue" stroke="#ff7300" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default Chart;
