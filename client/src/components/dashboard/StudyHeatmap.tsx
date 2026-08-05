import React from 'react';

interface HeatmapCell {
  date: string;
  count: number;
}

interface StudyHeatmapProps {
  data: HeatmapCell[];
}

export const StudyHeatmap: React.FC<StudyHeatmapProps> = ({ data }) => {
  // Map date string -> count for fast retrieval
  const countsMap = new Map<string, number>();
  data.forEach((item) => {
    // Standardize date keys (YYYY-MM-DD)
    const dateStr = new Date(item.date).toISOString().split('T')[0];
    countsMap.set(dateStr, item.count);
  });

  // Generate the last 365 days, aligned into weeks
  const today = new Date();
  const cells: { dateStr: string; count: number; dayOfWeek: number }[] = [];

  // Find the start date: 364 days ago
  const startDate = new Date();
  startDate.setDate(today.getDate() - 364);

  // Shift startDate back to the previous Sunday to align rows/columns nicely
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  // Generate date cells up to today
  const tempDate = new Date(startDate);
  while (tempDate <= today) {
    const dateStr = tempDate.toISOString().split('T')[0];
    cells.push({
      dateStr,
      count: countsMap.get(dateStr) || 0,
      dayOfWeek: tempDate.getDay(),
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Chunk cells into columns (weeks)
  const columns: typeof cells[] = [];
  let currentWeek: typeof cells = [];

  cells.forEach((cell, idx) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7 || idx === cells.length - 1) {
      columns.push(currentWeek);
      currentWeek = [];
    }
  });

  // Get color based on activity count
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-slate-900 border-slate-950 hover:bg-slate-850';
    if (count <= 2) return 'bg-brand-500/20 border-brand-500/10 hover:bg-brand-500/30';
    if (count <= 4) return 'bg-brand-500/40 border-brand-500/20 hover:bg-brand-500/50';
    if (count <= 6) return 'bg-brand-500/70 border-brand-500/30 hover:bg-brand-500/80';
    return 'bg-brand-500 border-brand-400/30 hover:bg-brand-405';
  };

  const formatTooltip = (dateStr: string, count: number) => {
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${count} task${count !== 1 ? 's' : ''} completed on ${formattedDate}`;
  };

  // Get month labels positions
  const monthLabels: { label: string; index: number }[] = [];
  let lastMonth = -1;

  columns.forEach((week, colIdx) => {
    // Check first day of week
    if (week.length > 0) {
      const date = new Date(week[0].dateStr);
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: date.toLocaleString('default', { month: 'short' }),
          index: colIdx,
        });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-extrabold text-white">Learning Heatmap</h4>
          <p className="text-xs text-slate-500">Your study consistency over the last year</p>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-955"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-brand-500/20 border border-brand-500/10"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-brand-500/40 border border-brand-500/20"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-brand-500/70 border border-brand-500/30"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-brand-500 border border-brand-400/30"></div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-brand-500/20">
        <div className="min-w-[660px] flex flex-col space-y-1">
          
          {/* Month Header Row */}
          <div className="relative h-4 text-[10px] font-bold text-slate-650 flex">
            <div className="w-6 shrink-0"></div> {/* Spacer for Day labels column */}
            <div className="flex-1 relative">
              {monthLabels.map((ml, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `${(ml.index / columns.length) * 100}%` }}
                >
                  {ml.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="flex">
            {/* Y-Axis Day Labels */}
            <div className="w-6 flex flex-col justify-between text-[8px] font-black text-slate-600 h-[88px] pr-2 uppercase">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Column Weeks Wrapper */}
            <div className="flex-1 flex gap-1">
              {columns.map((week, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1">
                  {week.map((cell) => (
                    <div
                      key={cell.dateStr}
                      title={formatTooltip(cell.dateStr, cell.count)}
                      className={`w-2.5 h-2.5 rounded-[2.5px] border border-transparent transition-all cursor-pointer ${getCellColor(
                        cell.count
                      )}`}
                    />
                  ))}
                  {/* Fill missing days in partial final week */}
                  {week.length < 7 &&
                    Array.from({ length: 7 - week.length }).map((_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="w-2.5 h-2.5 rounded-[2.5px] bg-transparent pointer-events-none"
                      />
                    ))}
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default StudyHeatmap;
