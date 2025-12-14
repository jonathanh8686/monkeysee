"use client";

import { useEffect, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ColDef, ModuleRegistry } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Prediction {
  id: number;
  content: string;
  author_name: string;
  elo: number;
  status: string;
  outcome?: string;
  created_at: string;
}

const PredictionTable: React.FC = () => {
  const [rowData, setRowData] = useState<Prediction[]>([]);

  const hasDataChanged = (
    oldData: Prediction[],
    newData: Prediction[]
  ): boolean => {
    if (oldData.length !== newData.length) return true;

    for (let i = 0; i < oldData.length; i++) {
      const oldItem = oldData[i];
      const newItem = newData[i];

      if (
        oldItem.id !== newItem.id ||
        oldItem.content !== newItem.content ||
        oldItem.author_name !== newItem.author_name ||
        oldItem.elo !== newItem.elo ||
        oldItem.status !== newItem.status ||
        oldItem.outcome !== newItem.outcome ||
        oldItem.created_at !== newItem.created_at
      ) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch("/backend/predictions");
        if (!response.ok) {
          throw new Error("Failed to fetch predictions");
        }
        const data: Prediction[] = await response.json();

        // Only update state if data has actually changed
        setRowData((prevData) =>
          hasDataChanged(prevData, data) ? data : prevData
        );

        console.log(data);
      } catch (error) {
        console.error("Error fetching predictions:", error);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 1000);
    return () => clearInterval(interval);
  }, []);

  const columnDefs: ColDef[] = [
    { field: "content", headerName: "Predictions", flex: 1 },
  ];

  return (
    <div className="h-full w-full bg-zinc-900/40 rounded-lg border-zinc-800/40 border-2">
      <div className="ag-theme-alpine dark-grid h-full w-full">
        <AgGridReact
          theme={themeQuartz}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id.toString()}
          defaultColDef={{
            sortable: false,
            filter: false,
          }}
        />
      </div>
    </div>
  );
};

export default PredictionTable;
